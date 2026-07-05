'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OftpayQuestaoDoc } from '@/services/oftpayQuestoesService';
import {
  createSimulado,
  deleteSimulado,
  finalizeSimulado,
  listSimuladoAnswers,
  listUserSimuladoAnswers,
  listUserSimulados,
  saveSimuladoAnswer,
} from '@/services/oftpaySimuladosService';
import {
  countConfiguredSmartRows,
  smartRowsToSelections,
  totalQuestionsFromSmartRows,
  type SmartSearchRow,
} from '@/lib/oftpay/simuladoTopicSearch';
import {
  buildDefaultSimuladoTitle,
  buildSimuladoQuestionIds,
  computePerformanceBySubject,
  computeSimuladoResultado,
  DIFICULDADE_LABEL,
  SIMULADO_STATUS_LABEL,
  validateSelections,
  type OftpaySimuladoDoc,
  type OftpaySimuladoSelection,
} from '@/types/oftpaySimulados';
import {
  buildSubjectGroupConfigs,
  countSubjectGroupSelections,
  selectionsFromSubjectGroups,
  totalQuestionsFromSubjectGroups,
  type SubjectGroupConfig,
} from '@/lib/oftpay/simuladoSubjectListPicker';
import SimuladoSubjectListPicker from './SimuladoSubjectListPicker';
import SimuladoSmartSearchBuilder from './SimuladoSmartSearchBuilder';
import AlunoResourceFolders, { type AlunoResourceFolderId } from './AlunoResourceFolders';
import SimuladoChatDuvidasPanel from './SimuladoChatDuvidasPanel';
import {
  getQuestaoCapituloDisplay,
  type AlternativaLetra,
  type QuestaoDificuldade,
} from '@/types/oftpayQuestoes';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Loader2,
  LogOut,
  Play,
  Sparkles,
  Trash2,
  Trophy,
  XCircle,
} from 'lucide-react';

type PanelView = 'home' | 'run' | 'result';

interface OftpaySimuladoPanelProps {
  userId: string | null;
  userEmail?: string | null;
  publicadas: OftpayQuestaoDoc[];
  loadingPublicadas: boolean;
  onPerformanceRefresh?: () => void;
  /** Integrado na Área do Aluno — sem cabeçalho de aba separada. */
  embedded?: boolean;
  onSimuladoModeChange?: (inSimuladoFlow: boolean) => void;
}

function formatDate(ms?: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function computeSimuladoCompletionPercent(
  simulado: OftpaySimuladoDoc,
  answeredCount: number
): number {
  const total = simulado.questionIds.length;
  if (total <= 0) return 0;
  return Math.round((answeredCount / total) * 100);
}

interface SimuladoCardStats {
  answered: number;
  acertos: number;
  erros: number;
}

function buildSimuladoStatsBySimulado(
  simulados: OftpaySimuladoDoc[],
  answers: Awaited<ReturnType<typeof listUserSimuladoAnswers>>
): Map<string, SimuladoCardStats> {
  const answersBySim = new Map<string, Map<string, boolean>>();

  for (const answer of answers) {
    const byQuestion = answersBySim.get(answer.simuladoId) ?? new Map<string, boolean>();
    byQuestion.set(answer.questionId, answer.acertou);
    answersBySim.set(answer.simuladoId, byQuestion);
  }

  const result = new Map<string, SimuladoCardStats>();
  for (const sim of simulados) {
    const byQuestion = answersBySim.get(sim.id) ?? new Map<string, boolean>();
    let acertos = 0;
    let erros = 0;
    for (const qid of sim.questionIds) {
      const acertou = byQuestion.get(qid);
      if (acertou === undefined) continue;
      if (acertou) acertos += 1;
      else erros += 1;
    }
    result.set(sim.id, {
      answered: acertos + erros,
      acertos,
      erros,
    });
  }
  return result;
}

function SimuladoScoreBars({
  acertos,
  erros,
  total,
}: {
  acertos: number;
  erros: number;
  total: number;
}) {
  const denom = Math.max(total, 1);

  return (
    <div className="w-[52px] space-y-1">
      <div className="flex items-center gap-1">
        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden min-w-0">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-300"
            style={{ width: `${(acertos / denom) * 100}%` }}
          />
        </div>
        <span className="text-[10px] font-semibold text-green-700 tabular-nums min-w-[0.75rem] text-right">
          {acertos}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden min-w-0">
          <div
            className="h-full rounded-full bg-red-500 transition-all duration-300"
            style={{ width: `${(erros / denom) * 100}%` }}
          />
        </div>
        <span className="text-[10px] font-semibold text-red-600 tabular-nums min-w-[0.75rem] text-right">
          {erros}
        </span>
      </div>
    </div>
  );
}

function SimuladoResultadoButton({
  percentualAcerto,
  onClick,
  disabled,
}: {
  percentualAcerto: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, percentualAcerto));
  const pctLabel = pct.toFixed(0);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={`${pctLabel}% de acerto — ver resultado`}
      className="relative flex-1 min-w-0 overflow-hidden rounded-lg border border-violet-200 text-violet-900 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow hover:shadow-sm"
    >
      <span className="absolute inset-0 bg-violet-50/90" aria-hidden />
      <span
        className="absolute inset-y-0 left-0 bg-violet-400/55 transition-all duration-500"
        style={{ width: `${pct}%` }}
        aria-hidden
      />
      <span className="relative flex items-center justify-between gap-2 w-full px-3 py-2 text-xs font-medium">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <Trophy className="w-3.5 h-3.5 flex-shrink-0" />
          Resultado
        </span>
        <span className="font-bold tabular-nums flex-shrink-0">{pctLabel}%</span>
      </span>
    </button>
  );
}

function SimuladoProgressRing({ percent }: { percent: number }) {
  const size = 52;
  const stroke = 4;
  const clamped = Math.min(100, Math.max(0, percent));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const ringColor = clamped >= 100 ? 'text-green-500' : 'text-blue-500';

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
      aria-label={`${clamped}% concluído`}
      title={`${clamped}% concluído`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={ringColor}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-gray-800 leading-none">
        {clamped}%
      </span>
    </div>
  );
}

export default function OftpaySimuladoPanel({
  userId,
  userEmail,
  publicadas,
  loadingPublicadas,
  onPerformanceRefresh,
  embedded = false,
  onSimuladoModeChange,
}: OftpaySimuladoPanelProps) {
  const [view, setView] = useState<PanelView>('home');
  const [simulados, setSimulados] = useState<OftpaySimuladoDoc[]>([]);
  const [simuladoStatsById, setSimuladoStatsById] = useState<Map<string, SimuladoCardStats>>(
    new Map()
  );
  const [loadingSimulados, setLoadingSimulados] = useState(false);
  const [simuladosError, setSimuladosError] = useState<string | null>(null);

  const [smartSearchRows, setSmartSearchRows] = useState<SmartSearchRow[]>([]);
  const [subjectGroups, setSubjectGroups] = useState<SubjectGroupConfig[]>([]);
  const [builderResetKey, setBuilderResetKey] = useState(0);
  const [title, setTitle] = useState('');
  const [createWarnings, setCreateWarnings] = useState<string[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [activeSimulado, setActiveSimulado] = useState<OftpaySimuladoDoc | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersMap, setAnswersMap] = useState<
    Map<string, { letra: AlternativaLetra; acertou: boolean }>
  >(new Map());
  const [loadingRun, setLoadingRun] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resultSimulado, setResultSimulado] = useState<OftpaySimuladoDoc | null>(null);
  const [resultAnswers, setResultAnswers] = useState<
    Awaited<ReturnType<typeof listSimuladoAnswers>>
  >([]);
  const [activeFolder, setActiveFolder] = useState<AlunoResourceFolderId>('montar');

  useEffect(() => {
    onSimuladoModeChange?.(view === 'run' || view === 'result');
  }, [view, onSimuladoModeChange]);

  useEffect(() => {
    if (view !== 'run') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [view]);

  const loadSimulados = useCallback(async () => {
    if (!userId) {
      setSimulados([]);
      setSimuladoStatsById(new Map());
      return;
    }
    setLoadingSimulados(true);
    setSimuladosError(null);
    try {
      const [list, answers] = await Promise.all([
        listUserSimulados(userId),
        listUserSimuladoAnswers(userId),
      ]);
      setSimulados(list);
      setSimuladoStatsById(buildSimuladoStatsBySimulado(list, answers));
    } catch (e) {
      console.error('[simulados] loadSimulados:', e);
      setSimulados([]);
      setSimuladoStatsById(new Map());
      setSimuladosError('Não foi possível carregar seus simulados.');
    } finally {
      setLoadingSimulados(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSimulados();
  }, [loadSimulados]);

  useEffect(() => {
    if (publicadas.length > 0) {
      setSubjectGroups(buildSubjectGroupConfigs(publicadas));
    } else {
      setSubjectGroups([]);
    }
  }, [publicadas]);

  const activeQuestions = useMemo(() => {
    if (!activeSimulado) return [];
    return activeSimulado.questionIds
      .map((id) => publicadas.find((q) => q.id === id))
      .filter((q): q is OftpayQuestaoDoc => Boolean(q));
  }, [activeSimulado, publicadas]);

  const currentQuestion = activeQuestions[currentIndex] ?? null;

  const selectionsFromSearch = useMemo(
    (): OftpaySimuladoSelection[] => smartRowsToSelections(smartSearchRows),
    [smartSearchRows]
  );

  const selectionsFromList = useMemo(
    (): OftpaySimuladoSelection[] => selectionsFromSubjectGroups(subjectGroups),
    [subjectGroups]
  );

  const selectionsFromTopics = useMemo(
    (): OftpaySimuladoSelection[] => [...selectionsFromSearch, ...selectionsFromList],
    [selectionsFromSearch, selectionsFromList]
  );

  const includedCount = useMemo(() => {
    return (
      countConfiguredSmartRows(smartSearchRows) + countSubjectGroupSelections(subjectGroups)
    );
  }, [smartSearchRows, subjectGroups]);

  const totalQuestoesSelecionadas = useMemo(() => {
    return (
      totalQuestionsFromSmartRows(smartSearchRows) +
      totalQuestionsFromSubjectGroups(subjectGroups)
    );
  }, [smartSearchRows, subjectGroups]);

  const resetSimuladoBuilder = () => {
    setSmartSearchRows([]);
    setSubjectGroups(buildSubjectGroupConfigs(publicadas));
    setTitle('');
    setCreateWarnings([]);
    setCreateError(null);
    setBuilderResetKey((key) => key + 1);
  };

  const handleCreateSimulado = async () => {
    await createSimuladoFromSelections(selectionsFromTopics, title.trim() || undefined, {
      resetBuilder: true,
    });
  };

  const createSimuladoFromSelections = async (
    selections: OftpaySimuladoSelection[],
    customTitle?: string,
    options?: { resetBuilder?: boolean; switchToMontar?: boolean }
  ) => {
    if (!userId) {
      setCreateError('Faça login para criar simulados.');
      return;
    }

    if (selections.length === 0) {
      setCreateError('Nenhum assunto selecionado para o simulado.');
      return;
    }

    const validationError = validateSelections(selections);
    if (validationError) {
      setCreateError(validationError);
      return;
    }

    const { questionIds, warnings } = buildSimuladoQuestionIds(publicadas, selections);
    setCreateWarnings(warnings);

    if (questionIds.length === 0) {
      setCreateError('Nenhuma questão publicada encontrada para os filtros selecionados.');
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const simTitle = customTitle?.trim() || buildDefaultSimuladoTitle(selections);
      const id = await createSimulado({
        userId,
        userEmail,
        title: simTitle,
        selections,
        questionIds,
      });
      await loadSimulados();
      if (options?.resetBuilder) {
        resetSimuladoBuilder();
      }
      if (options?.switchToMontar) {
        setActiveFolder('montar');
      }
      const created = (await listUserSimulados(userId)).find((s) => s.id === id) ?? null;
      if (created) await startRun(created);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Erro ao criar simulado.');
    } finally {
      setCreating(false);
    }
  };

  const startRun = async (simulado: OftpaySimuladoDoc) => {
    if (simulado.status === 'finalizado') {
      await openResult(simulado);
      return;
    }

    setLoadingRun(true);
    setRunError(null);
    try {
      const answers = await listSimuladoAnswers(simulado.id);
      const map = new Map<string, { letra: AlternativaLetra; acertou: boolean }>();
      for (const ans of answers) {
        map.set(ans.questionId, {
          letra: ans.respostaSelecionada,
          acertou: ans.acertou,
        });
      }
      setAnswersMap(map);
      setActiveSimulado(simulado);
      const firstUnanswered = simulado.questionIds.findIndex((qid) => !map.has(qid));
      setCurrentIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
      setView('run');
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Erro ao abrir simulado.');
    } finally {
      setLoadingRun(false);
    }
  };

  const openResult = async (simulado: OftpaySimuladoDoc) => {
    setLoadingRun(true);
    setRunError(null);
    try {
      const answers = await listSimuladoAnswers(simulado.id);
      setResultSimulado(simulado);
      setResultAnswers(answers);
      setView('result');
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Erro ao carregar resultado.');
    } finally {
      setLoadingRun(false);
    }
  };

  const handleSelectAnswer = async (letra: AlternativaLetra) => {
    if (!userId || !activeSimulado || !currentQuestion) return;
    const correta = currentQuestion.alternativas.find((a) => a.correta)?.letra;
    if (!correta) return;

    const acertou = letra === correta;
    setAnswersMap((prev) => {
      const next = new Map(prev);
      next.set(currentQuestion.id, { letra, acertou });
      return next;
    });

    try {
      await saveSimuladoAnswer({
        simuladoId: activeSimulado.id,
        userId,
        questao: currentQuestion,
        respostaSelecionada: letra,
        respostaCorreta: correta,
        acertou,
      });
      onPerformanceRefresh?.();
    } catch (e) {
      console.error('[simulados] saveSimuladoAnswer:', e);
      setRunError('Não foi possível salvar sua resposta. Tente novamente.');
    }
  };

  const handleFinalize = async () => {
    if (!userId || !activeSimulado) return;
    setFinalizing(true);
    setRunError(null);
    try {
      const finalized = await finalizeSimulado(activeSimulado.id, userId);
      await loadSimulados();
      onPerformanceRefresh?.();
      await openResult(finalized);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Erro ao finalizar simulado.');
    } finally {
      setFinalizing(false);
    }
  };

  const backToHome = () => {
    setView('home');
    setActiveSimulado(null);
    setResultSimulado(null);
    setRunError(null);
    setCreateError(null);
    setCreateWarnings([]);
    void loadSimulados();
  };

  /** Sai da tela cheia; o simulado permanece em andamento em Meus simulados. */
  const exitSimuladoRun = () => {
    if (
      !window.confirm(
        'Sair do simulado?\n\nSeu progresso já foi salvo. Você pode continuar depois em "Meus simulados".'
      )
    ) {
      return;
    }
    setView('home');
    setActiveSimulado(null);
    setRunError(null);
    void loadSimulados();
  };

  const handleDeleteSimulado = async (simulado: OftpaySimuladoDoc) => {
    if (!userId) return;
    const label = simulado.title ?? 'Simulado personalizado';
    if (!window.confirm(`Excluir "${label}"? Esta ação não pode ser desfeita.`)) return;

    setDeletingId(simulado.id);
    setRunError(null);
    try {
      await deleteSimulado(simulado.id, userId);
      if (activeSimulado?.id === simulado.id || resultSimulado?.id === simulado.id) {
        backToHome();
      }
      await loadSimulados();
      onPerformanceRefresh?.();
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Erro ao excluir simulado.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!userId) {
    if (embedded) {
      return (
        <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-4 text-sm text-gray-600">
          Faça login para montar simulados personalizados por tópico e dificuldade.
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
        Entre com sua conta para criar simulados personalizados.
      </div>
    );
  }

  if (view === 'run' && activeSimulado) {
    if (activeQuestions.length === 0) {
      return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-50 p-6">
          <p className="text-base text-red-700 mb-4 text-center">
            As questões deste simulado não estão mais disponíveis.
          </p>
          <button
            type="button"
            onClick={exitSimuladoRun}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-white"
          >
            <LogOut className="w-4 h-4" />
            Sair do simulado
          </button>
        </div>
      );
    }

    if (!currentQuestion) return null;

    const correta = currentQuestion.alternativas.find((a) => a.correta)?.letra ?? null;
    const saved = answersMap.get(currentQuestion.id);
    const answered = saved != null;
    const total = activeSimulado.questionIds.length;

    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col bg-gray-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="executar-simulado-heading"
      >
        <header className="flex-shrink-0 border-b border-gray-200 bg-white px-4 sm:px-6 py-3 shadow-sm">
          <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 id="executar-simulado-heading" className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {activeSimulado.title ?? 'Simulado'}
              </h2>
              <p className="text-sm text-gray-600">
                Questão {currentIndex + 1} de {total} · {answersMap.size} respondida(s)
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="hidden sm:inline text-xs rounded-full bg-blue-50 text-blue-800 px-2.5 py-1 border border-blue-100">
                {SIMULADO_STATUS_LABEL.em_andamento}
              </span>
              <button
                type="button"
                onClick={exitSimuladoRun}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair do simulado
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-6 space-y-5">
            {runError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {runError}
              </div>
            )}

            <article className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 space-y-5 shadow-sm">
              <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                <span className="font-medium text-gray-900">
                  {getQuestaoCapituloDisplay(currentQuestion)}
                </span>
                <span className="rounded-full bg-violet-50 text-violet-800 px-2 py-0.5">
                  {DIFICULDADE_LABEL[currentQuestion.dificuldade]}
                </span>
              </div>
              <p className="text-base sm:text-lg md:text-xl text-gray-900 leading-relaxed whitespace-pre-wrap font-medium">
                {currentQuestion.enunciado}
              </p>
              <ul className="space-y-2.5">
                {currentQuestion.alternativas.map((alt) => {
                  const isSelected = saved?.letra === alt.letra;
                  const isCorrect = alt.letra === correta;
                  let btnClass = 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50';
                  if (answered && isSelected && isCorrect) btnClass = 'border-green-500 bg-green-50';
                  if (answered && isSelected && !isCorrect) btnClass = 'border-red-500 bg-red-50';
                  if (answered && !isSelected && isCorrect) btnClass = 'border-green-400 bg-green-50/60';

                  return (
                    <li key={alt.letra}>
                      <button
                        type="button"
                        disabled={answered}
                        onClick={() => handleSelectAnswer(alt.letra)}
                        className={`w-full text-left rounded-lg border px-4 py-3 text-base sm:text-[17px] leading-snug transition-colors disabled:cursor-default ${btnClass}`}
                      >
                        <span className="font-semibold mr-2">{alt.letra})</span>
                        {alt.texto}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {answered && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  {saved.acertou ? (
                    <p className="inline-flex items-center gap-1.5 text-sm sm:text-base text-green-700 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Resposta correta
                    </p>
                  ) : (
                    <p className="inline-flex items-center gap-1.5 text-sm sm:text-base text-red-700 font-medium">
                      <XCircle className="w-4 h-4" />
                      Resposta incorreta — gabarito: {correta}
                    </p>
                  )}
                  <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5 text-sm sm:text-base text-gray-800">
                    <p className="text-xs font-medium text-gray-500 mb-1">Explicação</p>
                    <p className="whitespace-pre-wrap leading-relaxed">{currentQuestion.explicacao}</p>
                  </div>
                </div>
              )}
            </article>
          </div>
        </div>

        <footer className="flex-shrink-0 border-t border-gray-200 bg-white px-4 sm:px-6 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
          <div className="max-w-3xl mx-auto flex flex-wrap justify-between gap-2">
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <div className="flex flex-wrap gap-2">
              {currentIndex < total - 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
                  disabled={!answered}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Próxima
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={handleFinalize}
                disabled={finalizing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {finalizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Finalizando…
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4" />
                    Finalizar simulado
                  </>
                )}
              </button>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  if (view === 'result' && resultSimulado) {
    const resultado =
      resultSimulado.resultado ??
      computeSimuladoResultado(resultSimulado.questionIds, resultAnswers);
    const porAssunto = computePerformanceBySubject(resultAnswers);

    return (
      <section className="space-y-5" aria-labelledby="resultado-simulado-heading">
        <button
          type="button"
          onClick={backToHome}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar à Área do aluno
        </button>

        <div>
          <h2 id="resultado-simulado-heading" className="text-lg font-medium text-gray-900">
            Resultado — {resultSimulado.title ?? 'Simulado'}
          </h2>
          <p className="text-sm text-gray-600">
            Finalizado em {formatDate(resultSimulado.finishedAt ?? resultSimulado.startedAt)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-2xl font-semibold text-gray-900">{resultado.total}</p>
          </div>
          <div className="rounded-xl border border-green-100 bg-green-50/50 p-4">
            <p className="text-xs text-green-800">Acertos</p>
            <p className="text-2xl font-semibold text-green-900">{resultado.acertos}</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
            <p className="text-xs text-red-800">Erros</p>
            <p className="text-2xl font-semibold text-red-900">{resultado.erros}</p>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <p className="text-xs text-blue-800">% Acerto</p>
            <p className="text-2xl font-semibold text-blue-900">
              {resultado.percentualAcerto.toFixed(1)}%
            </p>
          </div>
        </div>

        {porAssunto.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <h3 className="text-sm font-medium text-gray-900 px-4 py-3 border-b border-gray-100 bg-gray-50">
              Desempenho por assunto neste simulado
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="px-4 py-2 font-medium">Assunto</th>
                    <th className="px-4 py-2 font-medium text-right">Acertos</th>
                    <th className="px-4 py-2 font-medium text-right">Erros</th>
                    <th className="px-4 py-2 font-medium text-right">% Acerto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {porAssunto.map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{row.label}</td>
                      <td className="px-4 py-2.5 text-right text-green-700">{row.acertos}</td>
                      <td className="px-4 py-2.5 text-right text-red-700">{row.erros}</td>
                      <td className="px-4 py-2.5 text-right font-medium">
                        {row.percentualAcerto.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {embedded && (
        <div
          id="questoes-aluno-heading"
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-6 py-8 sm:px-8 sm:py-10 text-white shadow-lg"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Área do aluno
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                Simulados personalizados
              </h2>
              <p className="text-blue-100 mt-2 text-sm sm:text-base leading-relaxed">
                Monte simulados por assunto ou tire dúvidas no chat — a IA responde com base nos
                tópicos mapeados e sugere questões para praticar.
              </p>
            </div>
            <div className="hidden sm:flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <BookOpen className="w-8 h-8 text-white/90" />
            </div>
          </div>
        </div>
      )}

      <AlunoResourceFolders active={activeFolder} onChange={setActiveFolder} />

      {createError && activeFolder === 'chat' && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {createError}
        </div>
      )}

      {activeFolder === 'chat' ? (
        <SimuladoChatDuvidasPanel
          publicadas={publicadas}
          creatingSimulado={creating}
          onCreateSimulado={(selections, simTitle) =>
            createSimuladoFromSelections(selections, simTitle, { switchToMontar: true })
          }
        />
      ) : (
      <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50/80 to-blue-50/50 rounded-t-2xl">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-violet-600" />
            Montar simulado
          </h3>
          <p className="text-sm text-gray-600 mt-0.5">
            Use a busca inteligente ou a lista por assunto — ou combine as duas formas.
          </p>
        </div>

        <div className="relative overflow-visible p-5 sm:p-6 space-y-5">
        {createError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {createError}
          </div>
        )}

        {createWarnings.length > 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900 space-y-1">
            {createWarnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Título (opcional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              includedCount > 0
                ? buildDefaultSimuladoTitle(selectionsFromTopics)
                : 'Simulado personalizado'
            }
            className="w-full max-w-md rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
          />
        </div>

        {loadingPublicadas ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
          </div>
        ) : (
          <div className="space-y-8">
            <SimuladoSmartSearchBuilder
              key={builderResetKey}
              publicadas={publicadas}
              rows={smartSearchRows}
              onRowsChange={setSmartSearchRows}
            />

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden>
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                  ou
                </span>
              </div>
            </div>

            <SimuladoSubjectListPicker
              publicadas={publicadas}
              groups={subjectGroups}
              onGroupsChange={setSubjectGroups}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCreateSimulado}
            disabled={creating || loadingPublicadas || includedCount === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-3 text-sm font-semibold shadow-md shadow-violet-200 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando simulado…
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Gerar simulado ({includedCount}{' '}
                {includedCount === 1 ? 'seleção' : 'seleções'})
              </>
            )}
          </button>
          {includedCount > 0 && !creating && (
            <span className="text-sm font-medium text-gray-600 tabular-nums">
              {totalQuestoesSelecionadas}{' '}
              {totalQuestoesSelecionadas === 1 ? 'questão' : 'questões'} no total
            </span>
          )}
        </div>
        </div>
      </div>
      )}

      <div>
        {runError && view === 'home' && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {runError}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Meus simulados
          </h3>
          {simulados.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
              {simulados.length} total
            </span>
          )}
        </div>
        {simuladosError && <p className="text-sm text-red-700 mb-3">{simuladosError}</p>}
        {loadingSimulados || loadingRun ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        ) : simulados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 px-6 py-10 text-center">
            <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600">
              Nenhum simulado ainda. Busque tópicos ou marque assuntos acima e clique em Gerar simulado.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {simulados.map((sim) => {
              const isFinalizado = sim.status === 'finalizado';
              const stats = simuladoStatsById.get(sim.id) ?? {
                answered: 0,
                acertos: 0,
                erros: 0,
              };
              const completionPct = computeSimuladoCompletionPercent(sim, stats.answered);
              const scorePct = sim.resultado?.percentualAcerto ?? 0;
              return (
                <li
                  key={sim.id}
                  className="group relative flex flex-col rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                      isFinalizado ? 'bg-green-500' : 'bg-amber-400'
                    }`}
                  />
                  <div className="pl-2 flex-1 min-w-0 relative">
                    <div className="absolute top-0 right-0 flex flex-col items-end gap-1.5 z-10 pointer-events-none">
                      <SimuladoProgressRing percent={completionPct} />
                      <SimuladoScoreBars
                        acertos={stats.acertos}
                        erros={stats.erros}
                        total={sim.questionIds.length}
                      />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug pr-14">
                      {sim.title ?? 'Simulado personalizado'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDate(sim.startedAt)}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[11px] rounded-md bg-gray-100 text-gray-700 px-2 py-0.5">
                        {sim.questionIds.length} questões
                      </span>
                      <span
                        className={`text-[11px] rounded-md px-2 py-0.5 ${
                          isFinalizado
                            ? 'bg-green-50 text-green-800'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {SIMULADO_STATUS_LABEL[sim.status]}
                      </span>
                    </div>
                  </div>

                  <div className="pl-2 flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                    {sim.status === 'em_andamento' ? (
                      <button
                        type="button"
                        onClick={() => startRun(sim)}
                        disabled={deletingId === sim.id}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs rounded-lg bg-blue-600 text-white px-3 py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Continuar
                      </button>
                    ) : (
                      <SimuladoResultadoButton
                        percentualAcerto={scorePct}
                        onClick={() => openResult(sim)}
                        disabled={deletingId === sim.id}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteSimulado(sim)}
                      disabled={deletingId === sim.id}
                      title="Excluir simulado"
                      aria-label="Excluir simulado"
                      className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      {deletingId === sim.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export type { PanelView as OftpaySimuladoPanelView };
