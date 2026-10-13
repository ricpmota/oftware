'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import { ExamesImagemPacientePanel } from '@/components/metaadmin/ExamesImagemPacientePanel';
import { LabPatientHeaderCard, LabResultCard } from '@/components/LabResultCard';
import { LabMetabolicSummarySection } from '@/components/LabMetabolicSummarySection';
import { LabSectionScoreBadge } from '@/components/LabSectionScoreBadge';
import TrendLine from '@/components/TrendLine';
import { useLabOrderBySection } from '@/hooks/useLabOrderBySection';
import { buildPatientLabSectionsFromOrder } from '@/lib/labExames/buildPatientLabSectionsFromOrder';
import { calculateSectionMetabolicScore } from '@/lib/labExames/labSectionScore';
import { getExameCampoNumerico } from '@/lib/labExames/exameCampoNumerico';
import { EXAME_LABORATORIAL_KEY_TO_FIELD } from '@/lib/metaadmin/exameLaboratorialFormFields';
import { bioTrendDir } from '@/utils/bioImpedanciaTrend';
import { getLabRange, type Sex } from '@/utils/labRangesFromJson';

type Subpasta = 'laboratoriais' | 'imagem';

type Props = {
  paciente: PacienteCompleto;
  /** Foto Auth já resolvida (opcional). */
  patientPhotoUrl?: string | null;
  /** Só exames laboratoriais (sem abas Laboratoriais / Imagem). */
  hideImagemTab?: boolean;
};

function safeDateToString(date: unknown): string {
  if (!date) return '';
  try {
    let d: Date;
    if (date instanceof Date) d = date;
    else if (typeof date === 'string') d = new Date(date);
    else if (typeof date === 'object' && date && 'toDate' in date) {
      d = (date as { toDate: () => Date }).toDate();
    } else d = new Date(date as string | number);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function formatExameDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  const date = new Date(y, m - 1, d);
  return date
    .toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
    .replace(/\./g, '')
    .replace(/\s+/g, ' ');
}

function formatExameDateLong(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Aba Exames do workspace profissional — chrome MetaNutri (verde, datas | resultados, lab cards).
 * Somente leitura (sem solicitar/editar/excluir).
 */
export default function ProfissionalExamesPacienteTab({
  paciente,
  patientPhotoUrl,
  hideImagemTab = false,
}: Props) {
  const [sub, setSub] = useState<Subpasta>('laboratoriais');
  const [dataSelecionadaManual, setDataSelecionadaManual] = useState('');
  const [secoesExpandidas, setSecoesExpandidas] = useState<Set<string>>(() => new Set());
  const { labOrderBySection, labLimitOverrides, labSectionLabels } = useLabOrderBySection();

  const exames = paciente.examesLaboratoriais || [];

  const examesOrdenados = useMemo(() => {
    return [...exames]
      .sort((a, b) => {
        const dA = safeDateToString(a.dataColeta);
        const dB = safeDateToString(b.dataColeta);
        return dB.localeCompare(dA);
      })
      .filter((e) => safeDateToString(e.dataColeta));
  }, [exames]);

  const dataInicial = examesOrdenados[0] ? safeDateToString(examesOrdenados[0].dataColeta) : '';
  const dataSelecionada = dataSelecionadaManual || dataInicial;

  const exameRaw =
    exames.find((e) => safeDateToString(e.dataColeta) === dataSelecionada) ||
    examesOrdenados[0] ||
    {};

  const getHemogramaVal = (ex: Record<string, unknown>, f: string) => {
    const hemo = ex.hemogramaCompleto as Record<string, unknown> | undefined;
    return (hemo?.[f] ?? ex[f]) || null;
  };

  const exameSelecionado = {
    ...(exameRaw as Record<string, unknown>),
    hemoglobina: getHemogramaVal(exameRaw as Record<string, unknown>, 'hemoglobina'),
    plaquetas: getHemogramaVal(exameRaw as Record<string, unknown>, 'plaquetas'),
    leucocitos: getHemogramaVal(exameRaw as Record<string, unknown>, 'leucocitos'),
  };

  const pacienteSex = paciente.dadosIdentificacao?.sexoBiologico as Sex | undefined;
  const patientLabSections = useMemo(
    () =>
      buildPatientLabSectionsFromOrder(
        labOrderBySection,
        EXAME_LABORATORIAL_KEY_TO_FIELD,
        labLimitOverrides,
        labSectionLabels
      ),
    [labOrderBySection, labLimitOverrides, labSectionLabels]
  );

  const dadosGrafico = useMemo(() => {
    return examesOrdenados
      .map((exame) => {
        const dataExame = safeDateToString(exame.dataColeta);
        const base: Record<string, unknown> = { data: dataExame };
        const er = exame as Record<string, unknown>;
        for (const sec of patientLabSections) {
          for (const campo of sec.fields) {
            base[campo.field] = getExameCampoNumerico(er, campo.field);
          }
        }
        return base;
      })
      .reverse();
  }, [examesOrdenados, patientLabSections]);

  const toggleSecao = (secaoId: string) => {
    setSecoesExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(secaoId)) next.delete(secaoId);
      else next.add(secaoId);
      return next;
    });
  };

  const patientName =
    paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Paciente';

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4" data-profissional-exames-tab>
      {!hideImagemTab && (
      <div className="flex w-full shrink-0 justify-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setSub('laboratoriais')}
          className={`flex min-h-[3.25rem] flex-1 items-center justify-center rounded-xl border-2 px-3 py-3 text-center text-sm font-bold shadow-sm transition-colors sm:min-h-[3.5rem] sm:px-6 sm:text-base ${
            sub === 'laboratoriais'
              ? 'border-green-600 bg-green-100 text-green-900 ring-2 ring-green-300/70'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          Exames Laboratoriais
        </button>
        <button
          type="button"
          onClick={() => setSub('imagem')}
          className={`flex min-h-[3.25rem] flex-1 items-center justify-center rounded-xl border-2 px-3 py-3 text-center text-sm font-bold shadow-sm transition-colors sm:min-h-[3.5rem] sm:px-6 sm:text-base ${
            sub === 'imagem'
              ? 'border-green-600 bg-green-100 text-green-900 ring-2 ring-green-300/70'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          Exames de Imagem
        </button>
      </div>
      )}

      {!hideImagemTab && sub === 'imagem' ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <ExamesImagemPacientePanel
            pacienteId={paciente.id}
            nomePacienteProntuario={patientName}
            examesDeImagem={paciente.examesDeImagem}
            onAdicionarExame={() => {}}
            onRemoverExame={() => {}}
            confirmarNomePacienteDoAnexo={async () => true}
            somenteLeitura
            layout="datesSplit"
          />
        </div>
      ) : examesOrdenados.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 shrink-0 text-amber-600" />
            <div>
              <h4 className="mb-2 text-lg font-semibold text-amber-900">Nenhum exame cadastrado</h4>
              <p className="text-sm text-amber-800">
                Os exames laboratoriais do paciente aparecerão aqui quando forem registrados pelo
                médico responsável.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(9rem,0.5fr)_minmax(0,1.5fr)] lg:items-stretch lg:gap-5">
          <div className="flex max-h-[min(40vh,22rem)] min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:max-h-none lg:min-h-[28rem]">
            <div className="shrink-0 border-b border-gray-200 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/40 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Datas dos exames
              </p>
              <p className="mt-0.5 text-sm font-semibold text-gray-900">
                {examesOrdenados.length} registro{examesOrdenados.length === 1 ? '' : 's'}
              </p>
            </div>
            <nav
              className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 py-2"
              aria-label="Datas de exames laboratoriais"
            >
              {examesOrdenados.map((exame, idx) => {
                const dataExame = safeDateToString(exame.dataColeta);
                const ativo = dataExame === dataSelecionada;
                return (
                  <button
                    key={`lab-date-${dataExame}-${idx}`}
                    type="button"
                    onClick={() => setDataSelecionadaManual(dataExame)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                      ativo
                        ? 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-500/30'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="block text-sm font-medium capitalize leading-tight">
                      {formatExameDateLabel(dataExame)}
                    </span>
                    <span className="mt-0.5 block text-[10px] tabular-nums text-gray-500">
                      {dataExame.split('-').reverse().join('/')}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:min-h-[28rem]">
            <div className="shrink-0 border-b border-gray-200 bg-gradient-to-r from-teal-50/50 via-white to-emerald-50/40 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Resultados
              </p>
              <p className="mt-0.5 text-sm font-semibold capitalize text-gray-900">
                {dataSelecionada ? formatExameDateLong(dataSelecionada) : 'Selecione uma data'}
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain p-3 text-sm sm:p-4">
              {(() => {
                const idxAtual = examesOrdenados.findIndex(
                  (e) => safeDateToString(e.dataColeta) === dataSelecionada
                );
                const exameAnterior =
                  idxAtual >= 0 && idxAtual < examesOrdenados.length - 1
                    ? examesOrdenados[idxAtual + 1]
                    : null;

                const campoTemValorNaDataSelecionada = (fieldKey: string) => {
                  let v: unknown;
                  if (['hemoglobina', 'plaquetas', 'leucocitos'].includes(fieldKey)) {
                    const hemo = (exameRaw as Record<string, unknown>).hemogramaCompleto as
                      | Record<string, unknown>
                      | undefined;
                    v = hemo?.[fieldKey] ?? exameSelecionado[fieldKey];
                  } else {
                    v = exameSelecionado[fieldKey];
                  }
                  return v !== null && v !== undefined && v !== '';
                };

                const allScores = patientLabSections.map((secao) =>
                  calculateSectionMetabolicScore({
                    sectionKey: secao.sectionId,
                    examKeys: secao.fields.map((f) => f.key),
                    labValues: exameSelecionado,
                    sex: pacienteSex,
                    dob: paciente.dadosIdentificacao?.dataNascimento,
                    limitOverrides: labLimitOverrides,
                    sectionLabel: secao.section,
                  })
                );
                const scoredSections = allScores.filter((s) => s.score !== null);
                const globalAvg =
                  scoredSections.length > 0
                    ? Math.round(
                        scoredSections.reduce((sum, s) => sum + (s.score ?? 0), 0) /
                          scoredSections.length
                      )
                    : null;

                return (
                  <>
                    <LabPatientHeaderCard
                      patientName={patientName}
                      dateLabel={dataSelecionada ? formatExameDateLong(dataSelecionada) : null}
                      score={globalAvg}
                      patientPhotoUrl={patientPhotoUrl}
                    />
                    <LabMetabolicSummarySection scores={allScores} />

                    {patientLabSections.map((secao) => {
                      const camposComValor = secao.fields.filter((c) =>
                        campoTemValorNaDataSelecionada(c.field)
                      );
                      if (camposComValor.length === 0) return null;

                      const isColapsada = !secoesExpandidas.has(secao.sectionId);
                      const secaoComExameForaDaFaixa = camposComValor.some((campo) => {
                        const rangeToUse = getLabRange(
                          campo.key,
                          pacienteSex,
                          paciente.dadosIdentificacao?.dataNascimento,
                          labLimitOverrides
                        );
                        if (!rangeToUse) return false;
                        const min = Number(rangeToUse.min);
                        const max = Number(rangeToUse.max);
                        if (!Number.isFinite(min) || !Number.isFinite(max)) return false;
                        const valor = Number(exameSelecionado[campo.field]);
                        if (!Number.isFinite(valor)) return false;
                        return valor < min || valor > max;
                      });
                      const sectionScore = calculateSectionMetabolicScore({
                        sectionKey: secao.sectionId,
                        examKeys: secao.fields.map((f) => f.key),
                        labValues: exameSelecionado,
                        sex: pacienteSex,
                        dob: paciente.dadosIdentificacao?.dataNascimento,
                        limitOverrides: labLimitOverrides,
                        sectionLabel: secao.section,
                      });

                      return (
                        <div
                          key={secao.sectionId}
                          className="overflow-hidden rounded-[18px] border border-slate-200/80 bg-white/80 text-sm"
                        >
                          <button
                            type="button"
                            onClick={() => toggleSecao(secao.sectionId)}
                            className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-2.5 gap-y-1 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-emerald-50/40 px-3 py-2.5 text-left transition-colors hover:from-slate-50 hover:to-emerald-50/60"
                          >
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                                secaoComExameForaDaFaixa
                                  ? 'bg-red-50 text-red-500'
                                  : 'bg-emerald-50 text-emerald-600'
                              }`}
                              aria-hidden
                            >
                              <Activity className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 whitespace-normal text-[15px] font-semibold leading-tight text-slate-800">
                              {secao.section}
                            </span>
                            <LabSectionScoreBadge
                              score={sectionScore.score}
                              color={sectionScore.color}
                            />
                            {isColapsada ? (
                              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                            )}
                          </button>

                          {!isColapsada && (
                            <div className="space-y-3 p-2.5 sm:p-3">
                              {camposComValor.map((campo) => {
                                const rangeToUse = getLabRange(
                                  campo.key,
                                  pacienteSex,
                                  paciente.dadosIdentificacao?.dataNascimento,
                                  labLimitOverrides
                                );
                                if (
                                  !rangeToUse ||
                                  !rangeToUse.label ||
                                  rangeToUse.min === undefined ||
                                  rangeToUse.max === undefined
                                ) {
                                  return null;
                                }
                                const value = exameSelecionado[campo.field] as number | undefined;
                                const valorAtualTrend = getExameCampoNumerico(
                                  exameRaw as Record<string, unknown>,
                                  campo.field
                                );
                                const valorAnteriorTrend = exameAnterior
                                  ? getExameCampoNumerico(
                                      exameAnterior as Record<string, unknown>,
                                      campo.field
                                    )
                                  : null;
                                const labTrendDir =
                                  valorAtualTrend != null && valorAnteriorTrend != null
                                    ? bioTrendDir(valorAtualTrend, valorAnteriorTrend)
                                    : 'none';

                                return (
                                  <LabResultCard
                                    key={campo.field}
                                    name={rangeToUse.label}
                                    value={value ?? null}
                                    unit={rangeToUse.unit}
                                    examKey={campo.key}
                                    range={rangeToUse}
                                    trendDir={labTrendDir}
                                  >
                                    {dadosGrafico.length > 0 &&
                                    dadosGrafico.some((d) => d[campo.field] != null) ? (
                                      <TrendLine
                                        data={dadosGrafico}
                                        dataKeys={[
                                          {
                                            key: campo.field,
                                            name: rangeToUse.label,
                                            stroke: '#10b981',
                                            dot: true,
                                          },
                                        ]}
                                        xKey="data"
                                        height={180}
                                        showLegend={false}
                                        showValueLabels
                                        premium
                                        unitLabel={rangeToUse.unit || ''}
                                        referenceBand={{
                                          min: rangeToUse.min,
                                          max: rangeToUse.max,
                                        }}
                                        formatter={(v: unknown) =>
                                          v != null ? `${parseFloat(String(v)).toFixed(1)}` : 'N/A'
                                        }
                                        referenceLines={[
                                          {
                                            value: rangeToUse.min,
                                            label: `Min: ${rangeToUse.min}`,
                                            stroke: '#94a3b8',
                                            strokeDasharray: '4 6',
                                          },
                                          {
                                            value: rangeToUse.max,
                                            label: `Max: ${rangeToUse.max}`,
                                            stroke: '#94a3b8',
                                            strokeDasharray: '4 6',
                                          },
                                        ]}
                                      />
                                    ) : null}
                                  </LabResultCard>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
