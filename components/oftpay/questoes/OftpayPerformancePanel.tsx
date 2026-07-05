'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { listQuestoesPublicadas, type OftpayQuestaoDoc } from '@/services/oftpayQuestoesService';
import { listUserAttempts } from '@/services/oftpayQuestionAttemptsService';
import {
  listSimuladoAnswers,
  listUserSimuladoAnswers,
  listUserSimulados,
} from '@/services/oftpaySimuladosService';
import {
  collectUniqueAnsweredQuestionIds,
  computePerformanceBySubject,
  computeStudyCoverageBySubject,
  SIMULADO_STATUS_LABEL,
  STUDY_COVERAGE_DIFFICULTY_FILTERS,
  STUDY_COVERAGE_DIFFICULTY_LABEL,
  type OftpaySimuladoDoc,
  type StudyCoverageByDifficulty,
  type StudyCoverageDifficultyFilter,
} from '@/types/oftpaySimulados';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Loader2,
  Map,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';

interface OftpayPerformancePanelProps {
  userId: string | null;
  userEmail?: string | null;
  refreshKey?: number;
  publicadas?: OftpayQuestaoDoc[];
}

function formatDate(ms?: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function scoreBadgeClass(pct: number): string {
  if (pct >= 70) return 'text-green-700 bg-green-50 border-green-200';
  if (pct >= 50) return 'text-amber-800 bg-amber-50 border-amber-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

function StudyCoverageItem({
  label,
  subtitle,
  byDifficulty,
  difficulty,
  onDifficultyChange,
  nested = false,
  expanded,
  onToggleExpand,
}: {
  label: string;
  subtitle?: string;
  byDifficulty: StudyCoverageByDifficulty;
  difficulty: StudyCoverageDifficultyFilter;
  onDifficultyChange: (value: StudyCoverageDifficultyFilter) => void;
  nested?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
}) {
  const stats = byDifficulty[difficulty];
  const hasQuestions = stats.totalQuestoesPublicadas > 0;

  return (
    <div className={nested ? 'rounded-lg border border-gray-100 bg-gray-50/40 p-3' : ''}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-0.5">
            <span
              className={`${nested ? 'text-sm font-medium' : 'text-sm font-semibold'} text-gray-900`}
            >
              {label}
            </span>
            {onToggleExpand && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="p-0.5 text-gray-400 hover:text-gray-700 transition-colors"
                aria-label={expanded ? 'Recolher tópicos' : 'Ver tópicos'}
              >
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
                />
              </button>
            )}
          </span>
          {subtitle && <span className="text-xs text-gray-500 block">{subtitle}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <select
            value={difficulty}
            onChange={(e) => onDifficultyChange(e.target.value as StudyCoverageDifficultyFilter)}
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs bg-white"
            aria-label={`Dificuldade — ${label}`}
          >
            {STUDY_COVERAGE_DIFFICULTY_FILTERS.map((d) => (
              <option key={d} value={d}>
                {STUDY_COVERAGE_DIFFICULTY_LABEL[d]}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500 min-w-[96px] text-right tabular-nums">
            {hasQuestions ? (
              <>
                {stats.questoesUnicasRespondidas}/{stats.totalQuestoesPublicadas} ·{' '}
                <span className="font-semibold text-emerald-700">
                  {stats.percentualCobertura.toFixed(1)}%
                </span>
              </>
            ) : (
              <span className="text-gray-400">Sem questões</span>
            )}
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
          style={{
            width: `${hasQuestions ? Math.min(100, stats.percentualCobertura) : 0}%`,
          }}
        />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: typeof Target;
  accent: 'gray' | 'emerald' | 'blue';
}) {
  const styles = {
    gray: 'border-gray-200 bg-white from-gray-50/80',
    emerald: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white',
    blue: 'border-blue-200/80 bg-gradient-to-br from-blue-50 to-white',
  };
  const iconStyles = {
    gray: 'text-gray-500 bg-gray-100',
    emerald: 'text-emerald-600 bg-emerald-100/80',
    blue: 'text-blue-600 bg-blue-100/80',
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${styles[accent]}`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2.5 ${iconStyles[accent]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 tracking-tight mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function OftpayPerformancePanel({
  userId,
  userEmail,
  refreshKey = 0,
  publicadas: publicadasProp,
}: OftpayPerformancePanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publicadas, setPublicadas] = useState<OftpayQuestaoDoc[]>(publicadasProp ?? []);
  const [simulados, setSimulados] = useState<OftpaySimuladoDoc[]>([]);
  const [uniqueAnsweredIds, setUniqueAnsweredIds] = useState<Set<string>>(new Set());
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [difficultyByRow, setDifficultyByRow] = useState<
    Record<string, StudyCoverageDifficultyFilter>
  >({});
  const [expandedSimuladoId, setExpandedSimuladoId] = useState<string | null>(null);
  const [expandedAnswers, setExpandedAnswers] = useState<
    Awaited<ReturnType<typeof listUserSimuladoAnswers>>
  >([]);

  const loadData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [pub, attempts, sims, simAnswers] = await Promise.all([
        publicadasProp ? Promise.resolve(publicadasProp) : listQuestoesPublicadas(),
        listUserAttempts(userId),
        listUserSimulados(userId),
        listUserSimuladoAnswers(userId),
      ]);

      if (!publicadasProp) setPublicadas(pub);
      setSimulados(sims);
      setUniqueAnsweredIds(collectUniqueAnsweredQuestionIds(simAnswers, attempts.map((a) => a.questionId)));
    } catch (e) {
      console.error('[desempenho] loadData:', e);
      setError('Não foi possível carregar seu desempenho. Tente recarregar a página.');
    } finally {
      setLoading(false);
    }
  }, [userId, publicadasProp]);

  useEffect(() => {
    if (publicadasProp) setPublicadas(publicadasProp);
  }, [publicadasProp]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const coverageSubjects = useMemo(
    () => computeStudyCoverageBySubject(publicadas, uniqueAnsweredIds),
    [publicadas, uniqueAnsweredIds]
  );

  const getRowDifficulty = (rowKey: string): StudyCoverageDifficultyFilter =>
    difficultyByRow[rowKey] ?? 'todas';

  const setRowDifficulty = (rowKey: string, value: StudyCoverageDifficultyFilter) => {
    setDifficultyByRow((prev) => ({ ...prev, [rowKey]: value }));
  };

  const toggleSubjectExpanded = (subjectKey: string) => {
    setExpandedSubjects((prev) => ({ ...prev, [subjectKey]: !prev[subjectKey] }));
  };

  const coverageSummary = useMemo(() => {
    const totalPublicadas = publicadas.length;
    const totalRespondidas = uniqueAnsweredIds.size;
    const pct =
      totalPublicadas > 0
        ? Math.round((totalRespondidas / totalPublicadas) * 1000) / 10
        : 0;
    return { totalPublicadas, totalRespondidas, pct };
  }, [publicadas, uniqueAnsweredIds]);

  const simuladosFinalizados = useMemo(
    () => simulados.filter((s) => s.status === 'finalizado'),
    [simulados]
  );

  const toggleSimuladoDetail = async (simuladoId: string) => {
    if (expandedSimuladoId === simuladoId) {
      setExpandedSimuladoId(null);
      setExpandedAnswers([]);
      return;
    }
    setExpandedSimuladoId(simuladoId);
    setExpandedAnswers(await listSimuladoAnswers(simuladoId));
  };

  if (!userId) {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 px-6 py-12 text-center">
          <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Entre com sua conta para ver estatísticas.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8" aria-labelledby="desempenho-heading">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 px-6 py-8 sm:px-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_55%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Meu Desempenho
          </div>
          <h2 id="desempenho-heading" className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Acompanhe seu progresso
          </h2>
          <p className="text-emerald-100 mt-2 text-sm sm:text-base max-w-2xl">
            Cobertura de estudo e resultados de simulados são métricas separadas — progresso ≠
            acerto.
          </p>
          {userEmail && (
            <p className="text-xs text-emerald-200/80 mt-2">{userEmail}</p>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : (
        <>
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Map className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Cobertura de estudo</h3>
            </div>
            <p className="text-sm text-gray-600 -mt-2">
              % de questões publicadas que você já respondeu (únicas), por assunto e tópico. Use o
              filtro de dificuldade em cada linha para ver a cobertura real.
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard
                label="Questões publicadas"
                value={coverageSummary.totalPublicadas}
                icon={BookOpen}
                accent="gray"
              />
              <KpiCard
                label="Únicas respondidas"
                value={coverageSummary.totalRespondidas}
                icon={Target}
                accent="emerald"
              />
              <KpiCard
                label="Cobertura geral"
                value={`${coverageSummary.pct.toFixed(1)}%`}
                icon={TrendingUp}
                accent="blue"
              />
            </div>

            <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50/60 to-transparent">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  Por assunto / tópico
                </h4>
              </div>
              {coverageSubjects.length === 0 ? (
                <p className="text-sm text-gray-500 px-5 py-10 text-center">
                  Nenhuma questão publicada para calcular cobertura.
                </p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {coverageSubjects.map((subject) => {
                    const isExpanded = Boolean(expandedSubjects[subject.key]);
                    const subjectStats = subject.byDifficulty.todas;

                    return (
                      <li key={subject.key} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                        <div className="space-y-3">
                          <StudyCoverageItem
                            label={subject.label}
                            subtitle={`${subjectStats.totalQuestoesPublicadas} publicada(s) · ${subject.topics.length} tópico${subject.topics.length !== 1 ? 's' : ''}`}
                            byDifficulty={subject.byDifficulty}
                            difficulty={getRowDifficulty(subject.key)}
                            onDifficultyChange={(value) => setRowDifficulty(subject.key, value)}
                            expanded={isExpanded}
                            onToggleExpand={() => toggleSubjectExpanded(subject.key)}
                          />

                          {isExpanded && subject.topics.length > 0 && (
                            <div className="border-t border-gray-100 pt-3 space-y-3">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                                Tópicos mapeados
                              </p>
                              <ul className="space-y-3">
                                {subject.topics.map((topic) => {
                                  const topicRowKey = `${subject.key}:${topic.key}`;
                                  return (
                                    <li key={topicRowKey}>
                                      <StudyCoverageItem
                                        nested
                                        label={topic.label}
                                        subtitle={`${topic.byDifficulty.todas.totalQuestoesPublicadas} publicada(s)`}
                                        byDifficulty={topic.byDifficulty}
                                        difficulty={getRowDifficulty(topicRowKey)}
                                        onDifficultyChange={(value) =>
                                          setRowDifficulty(topicRowKey, value)
                                        }
                                      />
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-violet-600" />
              <h3 className="text-lg font-semibold text-gray-900">Resultados de simulados</h3>
            </div>
            <p className="text-sm text-gray-600 -mt-2">
              Percentual de acerto por simulado finalizado.
            </p>

            {simuladosFinalizados.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 px-6 py-10 text-center">
                <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600">
                  Você ainda não finalizou simulados. Vá à Área do aluno para criar um.
                </p>
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {simuladosFinalizados.slice(0, 12).map((sim) => {
                  const res = sim.resultado;
                  const isExpanded = expandedSimuladoId === sim.id;
                  const porAssunto = isExpanded
                    ? computePerformanceBySubject(expandedAnswers)
                    : [];
                  const pct = res?.percentualAcerto ?? 0;

                  return (
                    <li
                      key={sim.id}
                      className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 line-clamp-2">
                              {sim.title ?? 'Simulado personalizado'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(sim.finishedAt ?? sim.startedAt)} ·{' '}
                              {SIMULADO_STATUS_LABEL.finalizado}
                            </p>
                          </div>
                          {res && (
                            <div
                              className={`flex-shrink-0 w-14 h-14 rounded-2xl border flex flex-col items-center justify-center ${scoreBadgeClass(pct)}`}
                            >
                              <span className="text-lg font-bold leading-none">
                                {pct.toFixed(0)}%
                              </span>
                              <span className="text-[9px] uppercase tracking-wide mt-0.5 opacity-80">
                                acerto
                              </span>
                            </div>
                          )}
                        </div>

                        {res && (
                          <div className="flex gap-3 mt-4 text-xs">
                            <span className="rounded-lg bg-green-50 text-green-800 px-2.5 py-1 font-medium">
                              {res.acertos} acertos
                            </span>
                            <span className="rounded-lg bg-red-50 text-red-800 px-2.5 py-1 font-medium">
                              {res.erros} erros
                            </span>
                            <span className="rounded-lg bg-gray-100 text-gray-700 px-2.5 py-1">
                              {res.total} total
                            </span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleSimuladoDetail(sim.id)}
                          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-violet-700 hover:text-violet-900"
                        >
                          <Trophy className="w-4 h-4" />
                          {isExpanded ? 'Ocultar por assunto' : 'Ver por assunto'}
                        </button>
                      </div>

                      {isExpanded && porAssunto.length > 0 && (
                        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4 space-y-3">
                          {porAssunto.map((row) => (
                            <div key={row.label}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium text-gray-800">{row.label}</span>
                                <span className="text-gray-600">
                                  {row.percentualAcerto.toFixed(0)}% ({row.acertos}/{row.total})
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-violet-500"
                                  style={{ width: `${row.percentualAcerto}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
