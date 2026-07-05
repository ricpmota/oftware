'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { auth } from '@/lib/firebase';
import {
  computeMappingPercent,
  inferLastPageFromTopics,
  isMappingComplete,
} from '@/lib/oftpay/apostilaTopicMappingChunks';
import { listApostilaTopicsWithStats } from '@/services/oftreviewApostilaTopicService';
import { listOftreviewContent } from '@/services/oftreviewContentService';
import type { TopicMappingProgress } from '@/types/oftreviewContent';
import type { OftpayQuestaoDoc } from '@/services/oftpayQuestoesService';
import {
  TOPIC_STATUS_BADGE,
  TOPIC_STATUS_LABEL,
  type OftreviewApostilaTopicWithStats,
} from '@/types/oftreviewApostilaTopic';
import {
  countCoveredSubjectSlots,
  getTotalSubjectSlots,
  PLANNED_SUBJECT_DIFFICULTIES,
  PLANNED_DIFFICULTY_LABEL,
  type PlannedSubjectDifficulty,
} from '@/lib/oftpay/plannedQuestionSubjects';
import {
  summarizePlaceholderTopics,
  topicHasPlaceholderPlannedSubjects,
} from '@/lib/oftpay/placeholderPlannedSubjects';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Layers,
  Loader2,
  Map,
  Sparkles,
  Wrench,
} from 'lucide-react';

interface ApostilaPdfOption {
  id: string;
  name: string;
}

interface OftpayCreatorGuidedPanelProps {
  userEmail: string;
  adminQuestoes: OftpayQuestaoDoc[];
  onGoToContentTab?: () => void;
  onQuestaoGenerated?: () => void;
}

function formatPages(pages?: number[]): string {
  if (!pages?.length) return '—';
  if (pages.length <= 6) return pages.join(', ');
  return `${pages.slice(0, 5).join(', ')}… (+${pages.length - 5})`;
}

function buildGenerateAllQueue(
  subjects: NonNullable<OftreviewApostilaTopicWithStats['plannedSubjects']>
): Array<{ subjectId: string; dificuldade: PlannedSubjectDifficulty }> {
  const queue: Array<{ subjectId: string; dificuldade: PlannedSubjectDifficulty }> = [];
  for (const diff of PLANNED_SUBJECT_DIFFICULTIES) {
    for (const subject of subjects) {
      if (!subject.byDifficulty[diff].covered) {
        queue.push({ subjectId: subject.id, dificuldade: diff });
      }
    }
  }
  return queue;
}

function getFirstPendingCell(
  subjects: NonNullable<OftreviewApostilaTopicWithStats['plannedSubjects']>
): { subjectId: string; dificuldade: PlannedSubjectDifficulty } | null {
  const queue = buildGenerateAllQueue(subjects);
  return queue[0] ?? null;
}

type PlaceholderRepairJob = {
  total: number;
  done: number;
  activeIndex: number;
  topicTitle: string;
  phase: 'preparando' | 'ia' | 'salvando';
  repairedCount: number;
  questionsDeleted: number;
};

const REPAIR_TOPIC_TIMEOUT_MS = 120_000;

async function fetchRepairPlaceholderTopic(
  token: string,
  apostilaTitulo: string,
  topicId: string
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REPAIR_TOPIC_TIMEOUT_MS);
  try {
    return await fetch('/api/oftpay/questoes/repair-placeholder-topics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ apostilaTitulo, topicId }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function countPendingGenerateCells(
  subjects: NonNullable<OftreviewApostilaTopicWithStats['plannedSubjects']>
): number {
  return buildGenerateAllQueue(subjects).length;
}

function countAllPendingGenerateCells(topics: OftreviewApostilaTopicWithStats[]): number {
  return topics.reduce((sum, topic) => {
    if (topic.status === 'ignorar') return sum;
    return sum + countPendingGenerateCells(topic.plannedSubjects ?? []);
  }, 0);
}

function getFirstPendingCellAcrossTopics(
  topics: OftreviewApostilaTopicWithStats[],
  onlyTopicIds?: Set<string>
): {
  topic: OftreviewApostilaTopicWithStats;
  subjectId: string;
  dificuldade: PlannedSubjectDifficulty;
} | null {
  for (const topic of topics) {
    if (onlyTopicIds && !onlyTopicIds.has(topic.id)) continue;
    if (topic.status === 'ignorar') continue;
    const next = getFirstPendingCell(topic.plannedSubjects ?? []);
    if (next) return { topic, ...next };
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const GENERATE_ALL_DELAY_MS = 5000;

type QuestaoInitialStatus = 'rascunho' | 'publicado';

function isCellAlreadyCoveredError(error: string): boolean {
  return error.includes('já possui questão') || error.includes('CELULA_JA_COBERTA');
}

function generateCellKey(
  topicId: string,
  subjectId: string,
  dificuldade: PlannedSubjectDifficulty
): string {
  return `${topicId}:${subjectId}:${dificuldade}`;
}

type GenerateCellResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function parseGenerateError(data: Record<string, unknown>): string {
  const details = Array.isArray(data.details)
    ? data.details.map((d) => String(d)).filter(Boolean)
    : [];
  const baseMsg =
    data.error === 'CONTEUDO_NAO_EXTRAIDO'
      ? 'Conteúdo não extraído. Vá à aba Conteúdo Extraído primeiro.'
      : data.error === 'PLANO_ASSUNTOS_AUSENTE'
        ? 'Remapeie os tópicos desta apostila para gerar o plano de assuntos.'
        : data.error === 'CELULA_JA_COBERTA'
          ? 'Esta combinação assunto/dificuldade já possui questão.'
          : data.error === 'TRECHO_INSUFICIENTE'
            ? 'O conteúdo deste tópico não é suficiente para gerar uma questão.'
            : typeof data.message === 'string'
              ? data.message
              : typeof data.error === 'string'
                ? data.error
                : 'Falha ao gerar questão.';
  const hint = typeof data.hint === 'string' ? data.hint : '';
  const detailSuffix = details.length > 0 ? ` (${details.join('; ')})` : '';
  const hintSuffix = hint ? ` ${hint}` : '';
  return `${baseMsg}${detailSuffix}${hintSuffix}`.trim();
}

export default function OftpayCreatorGuidedPanel({
  userEmail,
  adminQuestoes,
  onGoToContentTab,
  onQuestaoGenerated,
}: OftpayCreatorGuidedPanelProps) {
  const [apostilasPdf, setApostilasPdf] = useState<ApostilaPdfOption[]>([]);
  const [loadingApostilas, setLoadingApostilas] = useState(true);
  const [apostilasError, setApostilasError] = useState<string | null>(null);

  const [selectedApostila, setSelectedApostila] = useState('');
  const [topics, setTopics] = useState<OftreviewApostilaTopicWithStats[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);

  const [contentPages, setContentPages] = useState<number | null>(null);
  const [topicMappingProgress, setTopicMappingProgress] = useState<TopicMappingProgress | null>(null);
  const [loadingContentMeta, setLoadingContentMeta] = useState(false);

  const [mappingTopics, setMappingTopics] = useState(false);
  const [liveMapProgress, setLiveMapProgress] = useState<TopicMappingProgress | null>(null);
  const [mapMessage, setMapMessage] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const [generatingCellKey, setGeneratingCellKey] = useState<string | null>(null);
  const [generatingAllTopicId, setGeneratingAllTopicId] = useState<string | null>(null);
  const [generatingAllApostila, setGeneratingAllApostila] = useState(false);
  const [generateAllModalOpen, setGenerateAllModalOpen] = useState(false);
  const [repairJob, setRepairJob] = useState<PlaceholderRepairJob | null>(null);
  const [repairGenerateTopicIds, setRepairGenerateTopicIds] = useState<Set<string> | null>(null);
  const [genMessage, setGenMessage] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  /** Tópicos expandidos — padrão: todos recolhidos. */
  const [expandedTopicIds, setExpandedTopicIds] = useState<Set<string>>(() => new Set());

  const loadApostilas = useCallback(async () => {
    setLoadingApostilas(true);
    setApostilasError(null);
    try {
      const res = await fetch('/api/oftpay/list-apostilas?courseId=oftreview');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Falha ao listar apostilas.');
      }
      const apostilas = Array.isArray(data.apostilas) ? data.apostilas : [];
      setApostilasPdf(
        apostilas.map((a: { id?: string; name?: string }) => ({
          id: String(a.id ?? a.name ?? ''),
          name: String(a.name ?? a.id ?? ''),
        }))
      );
    } catch (e) {
      console.error('[criador-guiado] loadApostilas:', e);
      setApostilasPdf([]);
      setApostilasError('Não foi possível carregar as apostilas do bucket.');
    } finally {
      setLoadingApostilas(false);
    }
  }, []);

  /** Evita recarregar tópicos no meio do lote "Gerar todas". */
  const generatingAllTopicIdRef = useRef<string | null>(null);
  const generatingAllApostilaRef = useRef(false);

  const loadTopics = useCallback(
    async (options?: { silent?: boolean }): Promise<OftreviewApostilaTopicWithStats[]> => {
      if (!selectedApostila) {
        setTopics([]);
        return [];
      }
      if (!options?.silent) {
        setLoadingTopics(true);
      }
      setTopicsError(null);
      try {
        const list = await listApostilaTopicsWithStats(selectedApostila, adminQuestoes);
        setTopics(list);
        return list;
      } catch (e) {
        console.error('[criador-guiado] loadTopics:', e);
        setTopics([]);
        setTopicsError('Não foi possível carregar os tópicos desta apostila.');
        return [];
      } finally {
        if (!options?.silent) {
          setLoadingTopics(false);
        }
      }
    },
    [selectedApostila, adminQuestoes]
  );

  const loadContentMeta = useCallback(async () => {
    if (!selectedApostila || !userEmail) {
      setContentPages(null);
      return;
    }
    setLoadingContentMeta(true);
    try {
      const contents = await listOftreviewContent(userEmail);
      const match = contents.find(
        (c) => c.apostilaTitulo.trim().toLowerCase() === selectedApostila.trim().toLowerCase()
      );
      setContentPages(match?.totalPages ?? null);
      setTopicMappingProgress(match?.topicMappingProgress ?? null);
    } catch {
      setContentPages(null);
    } finally {
      setLoadingContentMeta(false);
    }
  }, [selectedApostila, userEmail]);

  useEffect(() => {
    loadApostilas();
  }, [loadApostilas]);

  useEffect(() => {
    generatingAllTopicIdRef.current = generatingAllTopicId;
  }, [generatingAllTopicId]);

  useEffect(() => {
    generatingAllApostilaRef.current = generatingAllApostila;
  }, [generatingAllApostila]);

  useEffect(() => {
    loadTopics();
    loadContentMeta();
    setMapMessage(null);
    setMapError(null);
    setGenMessage(null);
    setGenError(null);
    setLiveMapProgress(null);
  }, [selectedApostila, loadContentMeta]);

  const effectiveMappingProgress = useMemo((): TopicMappingProgress | null => {
    if (liveMapProgress) return liveMapProgress;
    if (topicMappingProgress) return topicMappingProgress;
    if (contentPages && topics.length > 0) {
      const lastPageProcessed = inferLastPageFromTopics(topics);
      if (lastPageProcessed > 0) {
        return { lastPageProcessed, totalPages: contentPages };
      }
    }
    return null;
  }, [liveMapProgress, topicMappingProgress, contentPages, topics]);

  const mappingPercent = useMemo(() => {
    if (!effectiveMappingProgress) return 0;
    return computeMappingPercent(
      effectiveMappingProgress.lastPageProcessed,
      effectiveMappingProgress.totalPages
    );
  }, [effectiveMappingProgress]);

  const mappingIncomplete = useMemo(() => {
    if (!effectiveMappingProgress) return false;
    return !isMappingComplete(
      effectiveMappingProgress.lastPageProcessed,
      effectiveMappingProgress.totalPages
    );
  }, [effectiveMappingProgress]);

  const pendingAllGenerateCount = useMemo(
    () => countAllPendingGenerateCells(topics),
    [topics]
  );

  const placeholderRepairStats = useMemo(
    () => summarizePlaceholderTopics(topics),
    [topics]
  );

  const repairPercent = useMemo(() => {
    if (!repairJob || repairJob.total === 0) return 0;
    if (repairJob.phase === 'preparando') return 2;
    const inProgress = repairJob.done + (repairJob.phase === 'ia' ? 0.45 : 0.85);
    return Math.min(99, Math.max(3, Math.round((inProgress / repairJob.total) * 100)));
  }, [repairJob]);

  const repairingPlaceholders = repairJob != null;

  const scopedPendingGenerateCount = useMemo(() => {
    if (!repairGenerateTopicIds) return pendingAllGenerateCount;
    return countAllPendingGenerateCells(
      topics.filter((topic) => repairGenerateTopicIds.has(topic.id))
    );
  }, [topics, repairGenerateTopicIds, pendingAllGenerateCount]);

  const mappingFullyComplete = topics.length > 0 && !mappingIncomplete;

  const runTopicMapping = async (mode: 'reset' | 'continue') => {
    if (!selectedApostila) return;
    if (contentPages == null) {
      setMapError(
        'Extraia o conteúdo desta apostila na aba Conteúdo Extraído antes de mapear tópicos.'
      );
      return;
    }

    if (mode === 'reset' && topics.length > 0) {
      const confirmed = window.confirm(
        'Remapear apaga todos os tópicos já mapeados desta apostila e recomeça do zero. Deseja continuar?'
      );
      if (!confirmed) return;
    }

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setMapError('Faça login para mapear tópicos.');
      return;
    }

    setMappingTopics(true);
    setMapError(null);
    setMapMessage(null);

    let requestMode: 'reset' | 'continue' = mode;
    let complete = false;
    let lastMessage = '';
    const skippedChunks: string[] = [];

    try {
      const token = await firebaseUser.getIdToken();

      while (!complete) {
        const res = await fetch('/api/oftpay/questoes/map-topics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ apostilaTitulo: selectedApostila, mode: requestMode }),
        });

        const data = await res.json().catch(() => ({}));

        if (
          typeof data.lastPageProcessed === 'number' &&
          typeof data.totalPages === 'number'
        ) {
          const progress = {
            lastPageProcessed: data.lastPageProcessed,
            totalPages: data.totalPages,
          };
          setLiveMapProgress(progress);
          setTopicMappingProgress(progress);
        }

        if (!res.ok) {
          const baseMsg =
            data.error === 'CONTEUDO_NAO_EXTRAIDO'
              ? 'Conteúdo não extraído. Vá à aba Conteúdo Extraído primeiro.'
              : typeof data.message === 'string'
                ? data.message
                : typeof data.error === 'string'
                  ? data.error
                  : 'Falha ao mapear tópicos.';
          const hint = typeof data.hint === 'string' ? data.hint : '';
          setMapError(hint ? `${baseMsg} ${hint}` : baseMsg);
          break;
        }

        lastMessage =
          typeof data.message === 'string'
            ? data.message
            : `${data.topicsAdded ?? 0} tópico(s) adicionado(s).`;

        if (data.chunkSkipped === true) {
          const warn =
            typeof data.warning === 'string'
              ? data.warning
              : 'Trecho sem tópicos — páginas avançadas automaticamente.';
          skippedChunks.push(warn);
        }

        complete = data.mappingComplete === true;
        requestMode = 'continue';

        if (!complete) {
          await loadTopics({ silent: true });
        }
      }

      if (complete) {
        const skippedNote =
          skippedChunks.length > 0
            ? ` ${skippedChunks.length} trecho(s) avançado(s) sem tópicos identificados.`
            : '';
        setMapMessage(`${lastMessage}${skippedNote}`.trim());
        setLiveMapProgress(null);
      } else if (skippedChunks.length > 0) {
        setMapMessage(skippedChunks[skippedChunks.length - 1]);
      }

      await loadTopics();
      await loadContentMeta();
    } catch (e) {
      setMapError(e instanceof Error ? e.message : 'Erro de conexão ao mapear tópicos.');
    } finally {
      setMappingTopics(false);
    }
  };

  const handleMapTopics = () => runTopicMapping('reset');
  const handleContinueMapping = () => runTopicMapping('continue');
  const handleRemapTopics = () => runTopicMapping('reset');

  const handleRepairPlaceholderTopics = async () => {
    if (!selectedApostila || placeholderRepairStats.topicCount === 0) return;
    if (contentPages == null) {
      setMapError('Extraia o conteúdo desta apostila antes de corrigir assuntos.');
      return;
    }

    const topicsToRepair = topics.filter((topic) =>
      topicHasPlaceholderPlannedSubjects(topic.plannedSubjects)
    );
    if (topicsToRepair.length === 0) {
      setMapError('Nenhum tópico com assuntos genéricos encontrado. Atualize a lista de tópicos.');
      return;
    }

    const previewTitles = topicsToRepair
      .slice(0, 6)
      .map((t) => t.topicTitle)
      .join('\n• ');
    const more =
      topicsToRepair.length > 6 ? `\n• … e mais ${topicsToRepair.length - 6}` : '';

    const confirmed = window.confirm(
      `Corrigir ${topicsToRepair.length} tópico(s) com assuntos genéricos (ex.: "Aspecto 6 do tópico")?\n\n` +
        `• A IA vai gerar assuntos reais para cada tópico\n` +
        `• Questões criadas com esses assuntos genéricos serão apagadas\n` +
        `• Depois você escolhe se gera rascunho ou publicado\n\n` +
        `Tópicos:\n• ${previewTitles}${more}`
    );
    if (!confirmed) return;

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setMapError('Faça login para corrigir assuntos.');
      return;
    }

    setMapError(null);
    setMapMessage(null);
    setGenError(null);

    const repairedIds: string[] = [];
    const repairErrors: string[] = [];
    let totalQuestionsDeleted = 0;
    const total = topicsToRepair.length;

    flushSync(() => {
      setRepairJob({
        total,
        done: 0,
        activeIndex: 0,
        topicTitle: topicsToRepair[0]?.topicTitle ?? '…',
        phase: 'preparando',
        repairedCount: 0,
        questionsDeleted: 0,
      });
    });

    try {
      let token: string;
      try {
        token = await firebaseUser.getIdToken();
      } catch {
        throw new Error('Não foi possível obter token de autenticação. Tente sair e entrar novamente.');
      }

      for (let i = 0; i < topicsToRepair.length; i++) {
        const topic = topicsToRepair[i];
        const topicTitle = topic.topicTitle || `Tópico ${i + 1}`;

        flushSync(() => {
          setRepairJob({
            total,
            done: i,
            activeIndex: i,
            topicTitle,
            phase: 'ia',
            repairedCount: repairedIds.length,
            questionsDeleted: totalQuestionsDeleted,
          });
        });

        let res: Response;
        try {
          res = await fetchRepairPlaceholderTopic(token, selectedApostila, topic.id);
        } catch (err) {
          const timedOut = err instanceof Error && err.name === 'AbortError';
          repairErrors.push(
            `${topicTitle}: ${timedOut ? 'Tempo esgotado (mais de 2 min). Tente de novo.' : 'Erro de conexão.'}`
          );
          flushSync(() => {
            setRepairJob({
              total,
              done: i + 1,
              activeIndex: i,
              topicTitle,
              phase: 'salvando',
              repairedCount: repairedIds.length,
              questionsDeleted: totalQuestionsDeleted,
            });
          });
          continue;
        }

        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

        if (!res.ok) {
          const base =
            typeof data.message === 'string'
              ? data.message
              : typeof data.error === 'string'
                ? data.error
                : `Falha HTTP ${res.status}`;
          repairErrors.push(`${topicTitle}: ${base}`);
        } else if (data.skipped !== true) {
          const deleted =
            typeof data.questionsDeleted === 'number' ? data.questionsDeleted : 0;
          totalQuestionsDeleted += deleted;

          const ids = Array.isArray(data.repairedTopicIds)
            ? data.repairedTopicIds.map((id) => String(id)).filter(Boolean)
            : [];
          repairedIds.push(...ids);
        }

        flushSync(() => {
          setRepairJob({
            total,
            done: i + 1,
            activeIndex: i,
            topicTitle,
            phase: 'salvando',
            repairedCount: repairedIds.length,
            questionsDeleted: totalQuestionsDeleted,
          });
        });
      }

      if (repairedIds.length === 0) {
        const detail = repairErrors.length > 0 ? repairErrors.join(' · ') : undefined;
        throw new Error(
          detail
            ? `Nenhum tópico foi corrigido. ${detail}`
            : 'Nenhum tópico com assuntos genéricos encontrado.'
        );
      }

      const partialNote =
        repairErrors.length > 0 ? ` (${repairErrors.length} falha(s) — veja o alerta abaixo.)` : '';

      setMapMessage(
        `${repairedIds.length} tópico(s) corrigido(s), ${totalQuestionsDeleted} questão(ões) removida(s). Gere as questões novamente para os assuntos atualizados.${partialNote}`
      );

      if (repairErrors.length > 0) {
        setMapError(repairErrors.join(' · '));
      }

      setRepairGenerateTopicIds(new Set(repairedIds));
      setExpandedTopicIds((prev) => new Set([...prev, ...repairedIds]));
      setGenerateAllModalOpen(true);

      await loadTopics();
      onQuestaoGenerated?.();
    } catch (e) {
      setMapError(e instanceof Error ? e.message : 'Erro ao corrigir assuntos genéricos.');
    } finally {
      setRepairJob(null);
    }
  };

  useEffect(() => {
    if (generatingAllTopicIdRef.current || generatingAllApostilaRef.current) return;
    void loadTopics({ silent: true });
  }, [adminQuestoes, loadTopics]);

  useEffect(() => {
    setExpandedTopicIds(new Set());
  }, [selectedApostila]);

  const toggleTopicExpanded = (topicId: string) => {
    setExpandedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const runGenerateForCell = async (
    topic: OftreviewApostilaTopicWithStats,
    subjectId: string,
    dificuldade: PlannedSubjectDifficulty,
    options?: { batchMode?: boolean; initialStatus?: QuestaoInitialStatus }
  ): Promise<GenerateCellResult> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      return { ok: false, error: 'Faça login para gerar questões.' };
    }

    const cellKey = generateCellKey(topic.id, subjectId, dificuldade);
    setGeneratingCellKey(cellKey);
    if (!options?.batchMode) {
      setGenError(null);
    }

    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/oftpay/questoes/generate-from-topic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topicId: topic.id,
          plannedSubjectId: subjectId,
          dificuldade,
          ...(options?.initialStatus ? { initialStatus: options.initialStatus } : {}),
          ...(options?.batchMode ? { onValidationFailure: 'cancel' } : {}),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

      if (!res.ok) {
        return { ok: false, error: parseGenerateError(data) };
      }

      const message =
        typeof data.message === 'string'
          ? data.message
          : options?.initialStatus === 'publicado'
            ? `Questão ${PLANNED_DIFFICULTY_LABEL[dificuldade]} criada e publicada (5 alternativas).`
            : `Questão ${PLANNED_DIFFICULTY_LABEL[dificuldade]} criada como rascunho (5 alternativas).`;

      await loadTopics({ silent: options?.batchMode });
      if (!options?.batchMode) {
        onQuestaoGenerated?.();
      }
      return { ok: true, message };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Erro de conexão ao gerar questão.',
      };
    } finally {
      setGeneratingCellKey(null);
    }
  };

  const handleGenerateForCell = async (
    topic: OftreviewApostilaTopicWithStats,
    subjectId: string,
    dificuldade: PlannedSubjectDifficulty
  ) => {
    setGenMessage(null);
    const result = await runGenerateForCell(topic, subjectId, dificuldade);
    if (result.ok) {
      setGenMessage(result.message);
    } else {
      setGenError(result.error);
    }
  };

  const handleGenerateAllForTopic = async (topicId: string) => {
    if (generatingAllApostilaRef.current) return;
    if (contentPages == null) {
      setGenError('Extraia o conteúdo desta apostila antes de gerar questões.');
      return;
    }

    const freshList = await loadTopics({ silent: true });
    const topic = freshList.find((t) => t.id === topicId);
    if (!topic) {
      setGenError('Tópico não encontrado.');
      return;
    }

    if (topic.status === 'ignorar') {
      setGenError('Este tópico está marcado como ignorar.');
      return;
    }

    const subjects = topic.plannedSubjects ?? [];
    const totalAtStart = countPendingGenerateCells(subjects);
    if (totalAtStart === 0) return;

    setExpandedTopicIds((prev) => new Set(prev).add(topicId));
    generatingAllTopicIdRef.current = topicId;
    setGeneratingAllTopicId(topicId);
    setGenError(null);
    setGenMessage(`Gerando 0/${totalAtStart}…`);

    let done = 0;
    let stopped = false;
    let lastCellKey: string | null = null;
    let stuckRepeats = 0;

    try {
      while (!stopped) {
        const list = await loadTopics({ silent: true });
        const current = list.find((t) => t.id === topicId);
        if (!current) break;

        const next = getFirstPendingCell(current.plannedSubjects ?? []);
        if (!next) break;

        const cellKey = generateCellKey(topicId, next.subjectId, next.dificuldade);
        if (cellKey === lastCellKey) {
          stuckRepeats += 1;
          if (stuckRepeats >= 3) {
            setGenError(
              'Geração em lote interrompida: a mesma célula não avançou após várias tentativas.'
            );
            stopped = true;
            break;
          }
        } else {
          stuckRepeats = 0;
          lastCellKey = cellKey;
        }

        setGenMessage(`Gerando ${done + 1}/${totalAtStart}…`);

        const result = await runGenerateForCell(
          current,
          next.subjectId,
          next.dificuldade,
          { batchMode: true }
        );

        if (!result.ok) {
          if (isCellAlreadyCoveredError(result.error)) {
            continue;
          }
          setGenError(
            done > 0
              ? `${result.error} (interrompido após ${done} de ${totalAtStart}.)`
              : result.error
          );
          stopped = true;
          break;
        }

        done += 1;
        setGenMessage(`Geradas ${done}/${totalAtStart} neste tópico…`);
      }

      await loadTopics({ silent: true });
      if (done > 0) {
        onQuestaoGenerated?.();
      }

      if (!stopped && done > 0) {
        setGenMessage(`Concluído: ${done} questão(ões) geradas neste tópico.`);
      }
    } finally {
      generatingAllTopicIdRef.current = null;
      setGeneratingAllTopicId(null);
    }
  };

  const handleGenerateAllQuestions = async (initialStatus: QuestaoInitialStatus) => {
    setGenerateAllModalOpen(false);

    if (contentPages == null) {
      setGenError('Extraia o conteúdo desta apostila antes de gerar questões.');
      return;
    }

    const freshList = await loadTopics({ silent: true });
    const scopedTopics = repairGenerateTopicIds
      ? freshList.filter((topic) => repairGenerateTopicIds.has(topic.id))
      : freshList;
    const totalAtStart = countAllPendingGenerateCells(scopedTopics);
    if (totalAtStart === 0) {
      setGenMessage('Todas as questões desta apostila já foram geradas.');
      return;
    }

    generatingAllApostilaRef.current = true;
    setGeneratingAllApostila(true);
    setGenError(null);
    setGenMessage(
      `Preparando geração (${initialStatus === 'publicado' ? 'publicadas' : 'rascunho'})…`
    );

    let done = 0;
    let stopped = false;
    let lastCellKey: string | null = null;
    let stuckRepeats = 0;

    try {
      while (!stopped) {
        const list = await loadTopics({ silent: true });
        const next = getFirstPendingCellAcrossTopics(list, repairGenerateTopicIds ?? undefined);
        if (!next) break;

        const cellKey = generateCellKey(next.topic.id, next.subjectId, next.dificuldade);
        if (cellKey === lastCellKey) {
          stuckRepeats += 1;
          if (stuckRepeats >= 3) {
            setGenError(
              'Geração em lote interrompida: a mesma célula não avançou após várias tentativas.'
            );
            stopped = true;
            break;
          }
        } else {
          stuckRepeats = 0;
          lastCellKey = cellKey;
        }

        setExpandedTopicIds((prev) => new Set(prev).add(next.topic.id));
        setGenMessage(
          `Gerando ${done + 1}/${totalAtStart} — ${next.topic.topicTitle} (${PLANNED_DIFFICULTY_LABEL[next.dificuldade]})…`
        );

        const result = await runGenerateForCell(
          next.topic,
          next.subjectId,
          next.dificuldade,
          { batchMode: true, initialStatus }
        );

        if (!result.ok) {
          if (isCellAlreadyCoveredError(result.error)) {
            continue;
          }
          setGenError(
            done > 0
              ? `${result.error} (interrompido após ${done} de ${totalAtStart}. Clique em Gerar Todas Questões para continuar de onde parou.)`
              : result.error
          );
          stopped = true;
          break;
        }

        done += 1;
        setGenMessage(`Geradas ${done}/${totalAtStart} nesta apostila…`);

        const afterList = await loadTopics({ silent: true });
        if (
          getFirstPendingCellAcrossTopics(afterList, repairGenerateTopicIds ?? undefined)
        ) {
          setGenMessage(`Aguardando ${GENERATE_ALL_DELAY_MS / 1000}s antes da próxima…`);
          await sleep(GENERATE_ALL_DELAY_MS);
        }
      }

      await loadTopics({ silent: true });
      if (done > 0) {
        onQuestaoGenerated?.();
      }

      if (!stopped) {
        if (done > 0) {
          setGenMessage(
            repairGenerateTopicIds
              ? `Concluído: ${done} questão(ões) geradas nos tópicos corrigidos (${initialStatus === 'publicado' ? 'publicadas' : 'rascunho'}).`
              : `Concluído: ${done} questão(ões) geradas nesta apostila (${initialStatus === 'publicado' ? 'publicadas' : 'rascunho'}).`
          );
        } else {
          setGenMessage(
            repairGenerateTopicIds
              ? 'Todas as questões dos tópicos corrigidos já estavam geradas.'
              : 'Todas as questões desta apostila já estavam geradas.'
          );
        }
      }
    } finally {
      generatingAllApostilaRef.current = false;
      setGeneratingAllApostila(false);
      setRepairGenerateTopicIds(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-gray-900">Gerar por apostila / tópico</h3>
          </div>
        </div>

        {apostilasError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {apostilasError}
          </div>
        )}

        {mapError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {mapError}
          </div>
        )}

        {mapMessage && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
            {mapMessage}
          </div>
        )}

        {genError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {genError}
          </div>
        )}

        {genMessage && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
            {genMessage}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Apostila oficial</label>
          {loadingApostilas ? (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando PDFs do bucket…
            </p>
          ) : apostilasPdf.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum PDF encontrado no bucket.</p>
          ) : (
            <select
              value={selectedApostila}
              onChange={(e) => setSelectedApostila(e.target.value)}
              disabled={mappingTopics}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
            >
              <option value="">Selecione uma apostila…</option>
              {apostilasPdf.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedApostila && (
          <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-gray-600" />
                Tópicos da apostila
              </h4>
              {loadingContentMeta ? (
                <span className="text-xs text-gray-500">Verificando conteúdo…</span>
              ) : contentPages != null ? (
                <span className="text-xs text-green-800 bg-green-50 border border-green-100 rounded-full px-2 py-0.5">
                  Conteúdo extraído: {contentPages} páginas
                </span>
              ) : (
                <span className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
                  Conteúdo ainda não extraído
                </span>
              )}
            </div>

            {(effectiveMappingProgress || mappingTopics) && contentPages != null && (
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                  <span>
                    Progresso do mapeamento:{' '}
                    <strong>
                      {effectiveMappingProgress?.lastPageProcessed ?? 0} de{' '}
                      {effectiveMappingProgress?.totalPages ?? contentPages} páginas
                    </strong>
                  </span>
                  <span className="font-medium text-blue-700">{mappingPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${Math.min(100, mappingPercent)}%` }}
                  />
                </div>
                {mappingIncomplete && !mappingTopics && (
                  <p className="text-xs text-amber-800">
                    Mapeamento parcial — use <strong>Continuar mapeamento</strong> para processar o
                    restante sem perder os tópicos já identificados.
                  </p>
                )}
              </div>
            )}

            {repairJob && (
              <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50/80 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950">
                  <span>
                    Corrigindo assuntos genéricos:{' '}
                    <strong>
                      {repairJob.phase === 'preparando'
                        ? `preparando… (0 de ${repairJob.total})`
                        : `${Math.min(repairJob.done + 1, repairJob.total)} de ${repairJob.total} tópico(s)`}
                    </strong>
                  </span>
                  <span className="font-medium text-amber-800">{repairPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-amber-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-600 transition-all duration-300"
                    style={{ width: `${Math.min(100, repairPercent)}%` }}
                  />
                </div>
                <p className="text-xs text-amber-900 truncate" title={repairJob.topicTitle}>
                  {repairJob.phase === 'preparando' ? (
                    <>Autenticando e iniciando correção…</>
                  ) : repairJob.phase === 'ia' ? (
                    <>
                      Gerando assuntos com IA: <strong>{repairJob.topicTitle}</strong>
                    </>
                  ) : (
                    <>
                      Concluído: <strong>{repairJob.topicTitle}</strong>
                      {repairJob.questionsDeleted > 0 && (
                        <span className="text-amber-800">
                          {' '}
                          · {repairJob.questionsDeleted} questão(ões) removida(s) até agora
                        </span>
                      )}
                    </>
                  )}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {topics.length === 0 && !mappingIncomplete ? (
                <button
                  type="button"
                  onClick={handleMapTopics}
                  disabled={mappingTopics || contentPages == null}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {mappingTopics ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mapeando tópicos…
                    </>
                  ) : (
                    <>
                      <Map className="w-4 h-4" />
                      Mapear tópicos desta apostila
                    </>
                  )}
                </button>
              ) : (
                <>
                  {mappingIncomplete && (
                    <button
                      type="button"
                      onClick={handleContinueMapping}
                      disabled={mappingTopics || contentPages == null}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {mappingTopics ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Mapeando… {mappingPercent}%
                        </>
                      ) : (
                        <>
                          <Map className="w-4 h-4" />
                          Continuar mapeamento
                        </>
                      )}
                    </button>
                  )}
                  {(topics.length > 0 || mappingIncomplete) && (
                    <button
                      type="button"
                      onClick={handleRemapTopics}
                      disabled={
                        mappingTopics ||
                        contentPages == null ||
                        generatingAllApostila ||
                        repairingPlaceholders
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white text-gray-800 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      Remapear tudo
                    </button>
                  )}
                  {placeholderRepairStats.topicCount > 0 && (
                    <button
                      type="button"
                      onClick={handleRepairPlaceholderTopics}
                      disabled={
                        mappingTopics ||
                        contentPages == null ||
                        generatingAllApostila ||
                        repairingPlaceholders
                      }
                      title={`Corrigir assuntos genéricos em ${placeholderRepairStats.topicCount} tópico(s)`}
                      className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-950 px-4 py-2 text-sm font-medium hover:bg-amber-100 disabled:opacity-50"
                    >
                      {repairingPlaceholders ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Corrigindo… {repairPercent}%
                        </>
                      ) : (
                        <>
                          <Wrench className="w-4 h-4" />
                          Corrigir assuntos genéricos ({placeholderRepairStats.topicCount})
                        </>
                      )}
                    </button>
                  )}
                  {mappingFullyComplete && (pendingAllGenerateCount > 0 || generatingAllApostila) && (
                    <button
                      type="button"
                      onClick={() => setGenerateAllModalOpen(true)}
                      disabled={
                        mappingTopics ||
                        contentPages == null ||
                        generatingAllApostila ||
                        generatingAllTopicId != null
                      }
                      title={`Gerar ${pendingAllGenerateCount} questão(ões) em todos os tópicos`}
                      className="inline-flex items-center gap-2 rounded-lg bg-violet-600 text-white px-4 py-2 text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
                    >
                      {generatingAllApostila ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Gerando todas questões…
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Gerar Todas Questões
                          {pendingAllGenerateCount > 0 && (
                            <span className="text-violet-200">({pendingAllGenerateCount})</span>
                          )}
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
              {contentPages == null && onGoToContentTab && (
                <button
                  type="button"
                  onClick={onGoToContentTab}
                  disabled={mappingTopics}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-white disabled:opacity-50"
                >
                  Ir para Conteúdo Extraído
                </button>
              )}
            </div>

            {loadingTopics ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            ) : topicsError ? (
              <p className="text-sm text-red-700">{topicsError}</p>
            ) : topics.length === 0 ? (
              <p className="text-sm text-gray-600">
                Nenhum tópico mapeado para <strong>{selectedApostila}</strong>. A IA analisará o
                conteúdo extraído e estimará quantas questões únicas podem ser criadas por tópico.
              </p>
            ) : (
              <ul className="space-y-2">
                {(genError || genMessage) && (
                  <li className="rounded-lg border px-3 py-2 text-sm mb-1">
                    {genError && (
                      <p className="text-red-800 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {genError}
                      </p>
                    )}
                    {genMessage && !genError && (
                      <p className="text-green-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        {genMessage}
                      </p>
                    )}
                  </li>
                )}
                <li className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1 text-xs text-gray-500">
                  <span>{topics.length} tópico(s) mapeado(s)</span>
                  <span>Clique no tópico para expandir detalhes e gerar questões</span>
                </li>
                {topics.map((topic) => {
                  const subjects = topic.plannedSubjects ?? [];
                  const coveredSlots = countCoveredSubjectSlots(subjects);
                  const totalSlots = getTotalSubjectSlots(subjects);
                  const isExpanded = expandedTopicIds.has(topic.id);
                  const summaryParts = [
                    subjects.length > 0
                      ? `${subjects.length} assunto(s) · ${coveredSlots}/${totalSlots} cobertos`
                      : 'Sem plano de assuntos',
                    `${topic.coveragePercent.toFixed(0)}% cobertura`,
                    topic.pages?.length ? `pág. ${formatPages(topic.pages)}` : null,
                  ].filter(Boolean);

                  return (
                  <li
                    key={topic.id}
                    className="rounded-lg border border-gray-200 bg-white overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleTopicExpanded(topic.id)}
                      aria-expanded={isExpanded}
                      className="w-full text-left px-4 py-3 flex items-start gap-2 hover:bg-gray-50/80 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{topic.topicTitle}</p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${TOPIC_STATUS_BADGE[topic.status]}`}
                          >
                            {TOPIC_STATUS_LABEL[topic.status]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{summaryParts.join(' · ')}</p>
                      </div>
                    </button>

                    {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-100 space-y-3">
                    {topic.topicSummary && (
                      <p className="text-xs text-gray-600 leading-relaxed pt-3">
                        {topic.topicSummary}
                      </p>
                    )}

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                      <div className="rounded bg-gray-50 px-2.5 py-1.5">
                        <span className="text-gray-500 block">Páginas</span>
                        <span className="font-medium text-gray-800">{formatPages(topic.pages)}</span>
                      </div>
                      <div className="rounded bg-violet-50 px-2.5 py-1.5">
                        <span className="text-violet-600 block">Questões possíveis</span>
                        <span className="font-medium text-violet-900">
                          {subjects.length > 0
                            ? totalSlots
                            : (topic.estimatedQuestionCapacity ?? '—')}
                        </span>
                      </div>
                      <div className="rounded bg-blue-50 px-2.5 py-1.5">
                        <span className="text-blue-600 block">Questões geradas</span>
                        <span className="font-medium text-blue-900">
                          {topic.generatedQuestionCount}
                        </span>
                      </div>
                      <div className="rounded bg-green-50 px-2.5 py-1.5">
                        <span className="text-green-700 block">Cobertura</span>
                        <span className="font-medium text-green-900">
                          {topic.coveragePercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {topic.keywords && topic.keywords.length > 0 && (
                      <p className="text-xs text-gray-500">
                        Palavras-chave: {topic.keywords.join(', ')}
                      </p>
                    )}

                    {subjects.length > 0 ? (
                      <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 space-y-3 overflow-x-auto">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-medium text-indigo-900">
                            Plano de assuntos ({coveredSlots}/{totalSlots} cobertos · 5 alternativas
                            cada)
                          </p>
                          {(() => {
                            const pendingCount = countPendingGenerateCells(subjects);
                            const isGeneratingAll = generatingAllTopicId === topic.id;
                            if (pendingCount === 0 && !isGeneratingAll) return null;

                            return (
                              <button
                                type="button"
                                onClick={() => handleGenerateAllForTopic(topic.id)}
                                disabled={
                                  isGeneratingAll ||
                                  generatingAllApostila ||
                                  generatingCellKey != null ||
                                  mappingTopics ||
                                  contentPages == null ||
                                  topic.status === 'ignorar'
                                }
                                title={`Gerar ${pendingCount} questão(ões): Fácil → Médio → Difícil, assunto a assunto`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-white text-violet-800 px-2.5 py-1.5 text-[11px] font-medium hover:bg-violet-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isGeneratingAll ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Gerando todas…
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Gerar todas
                                    <span className="text-violet-600/80">({pendingCount})</span>
                                  </>
                                )}
                              </button>
                            );
                          })()}
                        </div>
                        <table className="min-w-full text-xs border-collapse">
                          <thead>
                            <tr className="text-left text-gray-500">
                              <th className="pb-2 pr-3 font-medium min-w-[140px]">Assunto</th>
                              {PLANNED_SUBJECT_DIFFICULTIES.map((diff) => (
                                <th
                                  key={diff}
                                  className="pb-2 px-2 font-medium text-center min-w-[88px]"
                                >
                                  {PLANNED_DIFFICULTY_LABEL[diff]}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-indigo-100/80">
                            {subjects.map((subject) => (
                              <tr key={subject.id}>
                                <td className="py-2.5 pr-3 align-top text-gray-800 font-medium leading-snug">
                                  {subject.title}
                                </td>
                                {PLANNED_SUBJECT_DIFFICULTIES.map((diff) => {
                                  const slot = subject.byDifficulty[diff];
                                  const cellKey = generateCellKey(topic.id, subject.id, diff);
                                  const isGenerating = generatingCellKey === cellKey;
                                  const disabled =
                                    isGenerating ||
                                    generatingAllApostila ||
                                    generatingAllTopicId === topic.id ||
                                    generatingCellKey != null ||
                                    contentPages == null ||
                                    topic.status === 'ignorar' ||
                                    slot.covered;

                                  return (
                                    <td key={diff} className="py-2 px-2 align-top text-center">
                                      {slot.covered ? (
                                        <span
                                          className={`inline-flex flex-col items-center gap-0.5 ${
                                            slot.cancelled ? 'text-amber-700' : 'text-emerald-700'
                                          }`}
                                          title={slot.cancelledReason ?? undefined}
                                        >
                                          <CheckCircle2 className="w-4 h-4" />
                                          <span className="text-[10px]">
                                            {slot.cancelled ? 'Cancelada' : 'Gerada'}
                                          </span>
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled={disabled}
                                          onClick={() =>
                                            handleGenerateForCell(topic, subject.id, diff)
                                          }
                                          title={`Gerar questão ${PLANNED_DIFFICULTY_LABEL[diff]} — ${subject.title}`}
                                          className="inline-flex items-center justify-center gap-1 w-full rounded-lg border border-violet-200 bg-white text-violet-700 px-2 py-2 text-[11px] font-medium hover:bg-violet-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {isGenerating ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <Sparkles className="w-3.5 h-3.5" />
                                          )}
                                          Gerar
                                        </button>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
                        Sem plano de assuntos. Clique em <strong>Continuar mapeamento</strong> ou{' '}
                        <strong>Remapear tudo</strong> para a IA listar os assuntos distintos
                        previstos para cada questão.
                      </p>
                    )}
                    </div>
                    )}
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {generateAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200 p-5 space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="generate-all-modal-title"
          >
            <div>
              <h4 id="generate-all-modal-title" className="text-base font-semibold text-gray-900">
                {repairGenerateTopicIds ? 'Gerar questões dos tópicos corrigidos' : 'Gerar Todas Questões'}
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                {repairGenerateTopicIds
                  ? 'Gerará apenas os tópicos que acabaram de ser corrigidos (assuntos genéricos substituídos por assuntos reais).'
                  : 'Percorrerá todos os tópicos desta apostila, do primeiro ao último. Células já geradas serão ignoradas — se houver interrupção, você pode continuar depois.'}
              </p>
              {scopedPendingGenerateCount > 0 && (
                <p className="text-sm text-violet-800 mt-2">
                  <strong>{scopedPendingGenerateCount}</strong> questão(ões) pendente(s).
                </p>
              )}
            </div>

            <p className="text-sm font-medium text-gray-800">Como deseja salvar as questões?</p>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => handleGenerateAllQuestions('rascunho')}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white text-gray-800 px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
              >
                Rascunho
              </button>
              <button
                type="button"
                onClick={() => handleGenerateAllQuestions('publicado')}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-violet-700"
              >
                Publicada
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setGenerateAllModalOpen(false);
                setRepairGenerateTopicIds(null);
              }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-1"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
