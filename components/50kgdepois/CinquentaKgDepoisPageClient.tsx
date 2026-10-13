'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import AutoExpandTextarea from '@/components/50kgdepois/AutoExpandTextarea';
import CinquentaKgDepoisIntroScreen from '@/components/50kgdepois/CinquentaKgDepoisIntroScreen';
import {
  inputClassName,
  labelClassName,
} from '@/components/whitelabel/cadastroMedico/CadastroMedicoFormUi';
import { auth } from '@/lib/firebase';
import {
  CINQUENTA_KG_DEPOIS_AUTOSAVE_DEBOUNCE_MS,
} from '@/lib/50kgdepois/constants';
import { cinquentaKgDepoisAuthFetch } from '@/lib/50kgdepois/clientAuthFetch';
import { cinquentaKgDepoisAcessarUrl } from '@/lib/50kgdepois/cinquentaKgDepoisLogin';
import {
  CINQUENTA_KG_DEPOIS_CHAPTER_COUNT,
  CINQUENTA_KG_DEPOIS_INTERVIEW_CHAPTERS,
} from '@/lib/50kgdepois/interviewChapters';
import { computeChapterProgressPercent } from '@/lib/50kgdepois/interviewProgress';
import { CINQUENTA_KG_DEPOIS_CONSENT_VERSION } from '@/types/cinquentaKgDepois';
import type {
  CinquentaKgDepoisPhase,
  CinquentaKgDepoisSessionPayload,
} from '@/types/cinquentaKgDepois';

type View =
  | 'loading'
  | 'login'
  | 'intro'
  | 'consent'
  | 'chapter'
  | 'chapter_pause'
  | 'memories'
  | 'complete'
  | 'review';

type MemoryDraft = {
  clientId: string;
  id?: string;
  title: string;
  text: string;
  approxDate: string;
  lifePhase: string;
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

function newMemoryDraft(): MemoryDraft {
  return {
    clientId: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: '',
    text: '',
    approxDate: '',
    lifePhase: '',
  };
}

export default function CinquentaKgDepoisPageClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<View>('loading');
  const [session, setSession] = useState<CinquentaKgDepoisSessionPayload | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [memories, setMemories] = useState<MemoryDraft[]>([newMemoryDraft()]);
  const [consentChecked, setConsentChecked] = useState(false);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [busy, setBusy] = useState(false);
  const [pauseMessage, setPauseMessage] = useState<string | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef(false);

  const currentChapter = CINQUENTA_KG_DEPOIS_INTERVIEW_CHAPTERS[chapterIndex];
  const chapterProgress = useMemo(
    () =>
      computeChapterProgressPercent(
        chapterIndex,
        Object.fromEntries(
          Object.entries(answers).map(([id, answer]) => [
            id,
            { answer, skipped: skippedIds.has(id) },
          ])
        )
      ),
    [chapterIndex, answers, skippedIds]
  );

  const overallChapterLabel = useMemo(() => {
    if (view === 'memories') return 'Memórias livres';
    if (view === 'complete' || view === 'review') return 'Concluído';
    return `Capítulo ${chapterIndex + 1} de ${CINQUENTA_KG_DEPOIS_CHAPTER_COUNT}`;
  }, [view, chapterIndex]);

  const progressWidth = useMemo(() => {
    if (view === 'memories' || view === 'complete') return 100;
    return ((chapterIndex + 1) / CINQUENTA_KG_DEPOIS_CHAPTER_COUNT) * 100;
  }, [view, chapterIndex]);

  const hydrateFromSession = useCallback((payload: CinquentaKgDepoisSessionPayload) => {
    setSession(payload);
    const nextAnswers: Record<string, string> = {};
    for (const [id, record] of Object.entries(payload.answers)) {
      nextAnswers[id] = record.answer || '';
    }
    setAnswers(nextAnswers);
    setSkippedIds(new Set(payload.participant.skippedQuestionIds || []));
    setChapterIndex(payload.participant.currentChapterIndex || 0);

    const loadedMemories =
      payload.memories.length > 0
        ? payload.memories.map((m) => ({
            clientId: m.id,
            id: m.id,
            title: m.title,
            text: m.text,
            approxDate: m.approxDate,
            lifePhase: m.lifePhase,
          }))
        : [newMemoryDraft()];
    setMemories(loadedMemories);
  }, []);

  const resolveInitialView = useCallback((payload: CinquentaKgDepoisSessionPayload): View => {
    const phase = payload.participant.currentPhase;
    if (phase === 'complete') return 'complete';
    if (phase === 'memories') return 'memories';
    if (phase === 'review') return 'review';
    if (!payload.participant.consentAccepted) return 'intro';
    if (phase === 'consent') return 'consent';
    return 'chapter';
  }, []);

  const loadSession = useCallback(async () => {
    const res = await cinquentaKgDepoisAuthFetch('/api/50kgdepois/load');
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      session?: CinquentaKgDepoisSessionPayload;
    };
    if (!res.ok) throw new Error(data.error || 'Não foi possível carregar sua história.');
    if (!data.session) throw new Error('Sessão indisponível.');
    hydrateFromSession(data.session);
    return data.session;
  }, [hydrateFromSession]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
      if (!nextUser) {
        setView('login');
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (authLoading) return;
      if (!user) return;

      try {
        const loaded = await loadSession();
        if (cancelled) return;
        setView(resolveInitialView(loaded));
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, loadSession, resolveInitialView]);

  const buildAnswersPayload = useCallback(
    (questionIds?: string[]) => {
      const ids =
        questionIds ||
        currentChapter?.questions.map((qItem) => qItem.id) ||
        Object.keys(answers);

      return ids.map((questionId) => ({
        questionId,
        answer: answers[questionId] || '',
        skipped: skippedIds.has(questionId),
      }));
    },
    [answers, skippedIds, currentChapter]
  );

  const persist = useCallback(
    async (opts?: {
      questionIds?: string[];
      nextChapterIndex?: number;
      nextPhase?: CinquentaKgDepoisPhase;
      markCompleted?: boolean;
      memoriesPayload?: MemoryDraft[];
    }) => {
      if (!user) return;
      setSaveState('saving');
      setError('');

      try {
        if (opts?.memoriesPayload) {
          const res = await cinquentaKgDepoisAuthFetch('/api/50kgdepois/save', {
            method: 'POST',
            body: JSON.stringify({
              action: 'memories',
              memories: opts.memoriesPayload.map((m) => ({
                id: m.id,
                title: m.title,
                text: m.text,
                approxDate: m.approxDate,
                lifePhase: m.lifePhase,
              })),
              currentPhase: opts.nextPhase,
              markCompleted: opts.markCompleted,
            }),
          });
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            session?: CinquentaKgDepoisSessionPayload;
          };
          if (!res.ok) throw new Error(data.error || 'Erro ao salvar memórias.');
          if (data.session) hydrateFromSession(data.session);
        } else {
          const res = await cinquentaKgDepoisAuthFetch('/api/50kgdepois/save', {
            method: 'POST',
            body: JSON.stringify({
              action: 'answers',
              answers: buildAnswersPayload(opts?.questionIds),
              currentChapterIndex: opts?.nextChapterIndex ?? chapterIndex,
              currentPhase: opts?.nextPhase,
              skippedQuestionIds: Array.from(skippedIds),
              markCompleted: opts?.markCompleted,
            }),
          });
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            session?: CinquentaKgDepoisSessionPayload;
          };
          if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
          if (data.session) hydrateFromSession(data.session);
        }

        setSaveState('saved');
        if (savedHintTimer.current) clearTimeout(savedHintTimer.current);
        savedHintTimer.current = setTimeout(() => setSaveState('idle'), 2500);
      } catch (err) {
        setSaveState('error');
        setError((err as Error).message);
        throw err;
      }
    },
    [user, buildAnswersPayload, chapterIndex, skippedIds, hydrateFromSession]
  );

  const scheduleAutosave = useCallback(() => {
    pendingSave.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!pendingSave.current) return;
      pendingSave.current = false;
      try {
        await persist({ questionIds: currentChapter?.questions.map((q) => q.id) });
      } catch {
        /* erro já exibido */
      }
    }, CINQUENTA_KG_DEPOIS_AUTOSAVE_DEBOUNCE_MS);
  }, [persist, currentChapter]);

  const updateAnswer = useCallback(
    (questionId: string, value: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      if (skippedIds.has(questionId) && value.trim()) {
        setSkippedIds((prev) => {
          const next = new Set(prev);
          next.delete(questionId);
          return next;
        });
      }
      scheduleAutosave();
    },
    [scheduleAutosave, skippedIds]
  );

  const skipQuestion = useCallback(
    (questionId: string) => {
      setSkippedIds((prev) => new Set(prev).add(questionId));
      scheduleAutosave();
    },
    [scheduleAutosave]
  );

  const handleAcceptConsent = async () => {
    if (!consentChecked) {
      setError('Marque a caixa para continuar.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await cinquentaKgDepoisAuthFetch('/api/50kgdepois/save', {
        method: 'POST',
        body: JSON.stringify({
          action: 'consent',
          consentVersion: CINQUENTA_KG_DEPOIS_CONSENT_VERSION,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar consentimento.');
      await loadSession();
      setView('chapter');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const goToChapter = async (nextIndex: number, phase: CinquentaKgDepoisPhase = 'interview') => {
    setChapterIndex(nextIndex);
    await persist({ nextChapterIndex: nextIndex, nextPhase: phase });
  };

  const handleContinueChapter = async () => {
    setBusy(true);
    setError('');
    try {
      await persist({
        questionIds: currentChapter.questions.map((q) => q.id),
        nextChapterIndex: chapterIndex,
        nextPhase: 'interview',
      });

      if (currentChapter.closingMessage) {
        setPauseMessage(currentChapter.closingMessage);
        setView('chapter_pause');
        return;
      }

      if (chapterIndex >= CINQUENTA_KG_DEPOIS_CHAPTER_COUNT - 1) {
        setView('memories');
        await persist({ nextPhase: 'memories' });
        return;
      }

      await goToChapter(chapterIndex + 1);
      setView('chapter');
    } catch {
      /* erro exibido */
    } finally {
      setBusy(false);
    }
  };

  const handleBackChapter = async () => {
    if (chapterIndex <= 0) return;
    setBusy(true);
    try {
      await goToChapter(chapterIndex - 1);
      setView('chapter');
    } finally {
      setBusy(false);
    }
  };

  const handleFinishMemories = async () => {
    setBusy(true);
    setError('');
    try {
      await persist({
        memoriesPayload: memories.filter((m) => m.text.trim() || m.title.trim()),
        nextPhase: 'complete',
        markCompleted: true,
      });
      setView('complete');
    } catch {
      /* erro exibido */
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAndExit = async () => {
    setBusy(true);
    try {
      if (view === 'memories') {
        await persist({ memoriesPayload: memories, nextPhase: 'memories' });
      } else if (view === 'chapter' && currentChapter) {
        await persist({
          questionIds: currentChapter.questions.map((q) => q.id),
          nextChapterIndex: chapterIndex,
          nextPhase: 'interview',
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const saveStateLabel =
    saveState === 'saving'
      ? 'Salvando...'
      : saveState === 'saved'
        ? 'Salvo'
        : saveState === 'error'
          ? 'Erro ao salvar'
          : '';

  if (authLoading || (user && view === 'loading')) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">50 KG DEPOIS</h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            Faça login para contar sua história ou revisar as respostas da entrevista.
          </p>
          <button
            type="button"
            onClick={() => router.push(cinquentaKgDepoisAcessarUrl('/50kgdepois'))}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/20 transition-all"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-50 flex flex-col">
      {view !== 'intro' && view !== 'complete' && (
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
          <div className="max-w-lg mx-auto px-4 pt-4 pb-3 md:max-w-2xl">
            <div className="flex items-center justify-between mb-2 gap-3">
              <span className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">
                50 KG DEPOIS
              </span>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {saveStateLabel && <span className="text-emerald-600">{saveStateLabel}</span>}
                <span>{overallChapterLabel}</span>
                <Link href="/50kgdepois/respostas" className="text-emerald-700 hover:text-emerald-800 font-medium">
                  Ver respostas
                </Link>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                initial={false}
                animate={{ width: `${progressWidth}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
            {view === 'chapter' && (
              <div className="mt-2 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-300/80 transition-all duration-300"
                  style={{ width: `${chapterProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6 md:max-w-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={view + chapterIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col"
          >
            {view === 'intro' && (
              <CinquentaKgDepoisIntroScreen
                onStart={() => {
                  if (!session?.participant.consentAccepted) {
                    setView('consent');
                    return;
                  }
                  const phase = session.participant.currentPhase;
                  if (phase === 'complete') setView('complete');
                  else if (phase === 'memories') setView('memories');
                  else setView('chapter');
                }}
              />
            )}

            {view === 'consent' && (
              <div className="space-y-5">
                <h2 className="text-xl font-semibold text-slate-900">Antes de começar</h2>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm sm:text-base text-slate-700 leading-relaxed space-y-3">
                  <p>
                    Estas respostas serão utilizadas como material de pesquisa e construção do livro{' '}
                    <strong>50 KG DEPOIS</strong>.
                  </p>
                  <p>
                    Você poderá escolher posteriormente quais informações poderão ser publicadas.
                  </p>
                  <p>
                    Responder a uma pergunta não significa autorização automática para publicação de
                    todo o conteúdo.
                  </p>
                  <p>
                    Antes da versão final do livro, os trechos sensíveis atribuídos à sua história
                    deverão passar pelo processo de revisão e autorização definido para o projeto.
                  </p>
                </div>
                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => {
                      setConsentChecked(e.target.checked);
                      setError('');
                    }}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700 leading-relaxed">
                    Li e compreendi como minhas respostas serão utilizadas nesta etapa.
                  </span>
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            )}

            {view === 'chapter' && currentChapter && (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-medium text-emerald-700 mb-1">
                    Capítulo {currentChapter.number}
                  </p>
                  <h2 className="text-2xl font-bold text-slate-900 leading-snug">{currentChapter.title}</h2>
                  {currentChapter.introduction && (
                    <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                      {currentChapter.introduction}
                    </p>
                  )}
                </div>

                <div className="space-y-8">
                  {currentChapter.questions.map((question, idx) => (
                    <div key={question.id} className="space-y-2">
                      <label htmlFor={question.id} className="block text-base sm:text-lg font-medium text-slate-900 leading-snug">
                        {question.text}
                      </label>
                      {question.hint && <p className="text-sm text-slate-500">{question.hint}</p>}
                      <AutoExpandTextarea
                        id={question.id}
                        value={answers[question.id] || ''}
                        onChange={(val) => updateAnswer(question.id, val)}
                        large={question.large || currentChapter.id === 'a-carta'}
                        placeholder="Escreva com suas palavras..."
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => skipQuestion(question.id)}
                          className={`text-xs font-medium transition-colors ${
                            skippedIds.has(question.id)
                              ? 'text-amber-600'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {skippedIds.has(question.id) ? 'Marcado para responder depois' : 'Responder depois'}
                        </button>
                      </div>
                      {idx < currentChapter.questions.length - 1 && (
                        <div className="pt-2 border-b border-slate-100" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {view === 'chapter_pause' && pauseMessage && (
              <div className="flex flex-col justify-center py-10 space-y-6 text-center">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6 text-slate-700 whitespace-pre-line leading-relaxed">
                  {pauseMessage}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      if (chapterIndex >= CINQUENTA_KG_DEPOIS_CHAPTER_COUNT - 1) {
                        setView('memories');
                        await persist({ nextPhase: 'memories' });
                      } else {
                        await goToChapter(chapterIndex + 1);
                        setView('chapter');
                      }
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="mx-auto px-8 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600"
                >
                  Continuar
                </button>
              </div>
            )}

            {view === 'memories' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Existe alguma história que não perguntamos?</h2>
                  <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                    Às vezes, as partes mais importantes de uma história aparecem fora das perguntas.
                  </p>
                  <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
                    Existe algum momento, lembrança, pessoa, frase, fotografia, dificuldade ou conquista
                    que você acredita que precisa estar neste livro?
                  </p>
                </div>

                <div className="space-y-6">
                  {memories.map((memory, index) => (
                    <div
                      key={memory.clientId}
                      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-700">Memória {index + 1}</p>
                        {memories.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setMemories((prev) => prev.filter((m) => m.clientId !== memory.clientId))
                            }
                            className="text-slate-400 hover:text-red-500"
                            aria-label="Remover memória"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div>
                        <label className={labelClassName}>Título (opcional)</label>
                        <input
                          className={inputClassName}
                          value={memory.title}
                          onChange={(e) =>
                            setMemories((prev) =>
                              prev.map((m) =>
                                m.clientId === memory.clientId ? { ...m, title: e.target.value } : m
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={labelClassName}>Sua memória</label>
                        <AutoExpandTextarea
                          value={memory.text}
                          onChange={(val) =>
                            setMemories((prev) =>
                              prev.map((m) => (m.clientId === memory.clientId ? { ...m, text: val } : m))
                            )
                          }
                          large
                          placeholder="Conte esta lembrança com suas palavras..."
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className={labelClassName}>Data aproximada (opcional)</label>
                          <input
                            className={inputClassName}
                            value={memory.approxDate}
                            onChange={(e) =>
                              setMemories((prev) =>
                                prev.map((m) =>
                                  m.clientId === memory.clientId ? { ...m, approxDate: e.target.value } : m
                                )
                              )
                            }
                            placeholder="Ex.: 2018, verão de 2020"
                          />
                        </div>
                        <div>
                          <label className={labelClassName}>Fase da vida (opcional)</label>
                          <input
                            className={inputClassName}
                            value={memory.lifePhase}
                            onChange={(e) =>
                              setMemories((prev) =>
                                prev.map((m) =>
                                  m.clientId === memory.clientId ? { ...m, lifePhase: e.target.value } : m
                                )
                              )
                            }
                            placeholder="Ex.: adolescência, início do tratamento"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setMemories((prev) => [...prev, newMemoryDraft()])}
                  className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar outra memória
                </button>
              </div>
            )}

            {view === 'complete' && (
              <div className="space-y-6 py-4">
                <div className="text-center space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">SUA HISTÓRIA FOI GUARDADA.</h1>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 text-sm sm:text-base text-slate-700 leading-relaxed space-y-3">
                  <p className="font-medium text-slate-900">Antônio,</p>
                  <p>você acabou de fazer algo maior do que responder perguntas.</p>
                  <p>Você voltou ao início. Revisitou momentos difíceis. Lembrou de pessoas.</p>
                  <p>Reconheceu escolhas. E registrou uma transformação que, até agora, existia principalmente na sua memória.</p>
                  <p className="font-medium text-slate-900">Agora começa o nosso trabalho:</p>
                  <p>ouvir, compreender, pesquisar, organizar e transformar essa história em um livro capaz de alcançar pessoas que talvez estejam exatamente onde você estava um dia.</p>
                  <p>Este não é o fim da entrevista. Algumas respostas poderão abrir novas perguntas. Algumas lembranças poderão se transformar em capítulos.</p>
                  <p>Mas, a partir de agora, existe algo que antes não existia: o primeiro registro da história de</p>
                  <p className="text-center font-semibold text-slate-900 py-2">153 kg → 103 kg.</p>
                  <p className="text-center text-xs tracking-[0.2em] uppercase text-emerald-700 font-semibold">50 KG DEPOIS</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setView('review');
                    setChapterIndex(0);
                  }}
                  className="w-full py-3.5 rounded-xl font-semibold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                >
                  REVISAR MINHAS RESPOSTAS
                </button>
              </div>
            )}

            {view === 'review' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Revisar minhas respostas</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Última atualização: {formatDateTime(session?.participant.updatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CINQUENTA_KG_DEPOIS_INTERVIEW_CHAPTERS.map((ch, idx) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        setChapterIndex(idx);
                        setView('chapter');
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white hover:border-emerald-300"
                    >
                      {String(ch.number).padStart(2, '0')}. {ch.title}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setView('memories')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white hover:border-emerald-300"
                  >
                    Memórias livres
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        {(view === 'consent' ||
          view === 'chapter' ||
          view === 'memories' ||
          (view === 'review' && false)) && (
          <div className="sticky bottom-0 pt-6 pb-4 mt-auto bg-gradient-to-t from-white via-white to-transparent">
            <div className="flex flex-col gap-2">
              {view !== 'consent' && (
                <button
                  type="button"
                  onClick={handleSaveAndExit}
                  disabled={busy}
                  className="text-sm text-slate-500 hover:text-slate-700 self-center"
                >
                  Salvar e sair
                </button>
              )}
              <div className="flex gap-3">
                {view === 'chapter' && chapterIndex > 0 && (
                  <button
                    type="button"
                    onClick={handleBackChapter}
                    disabled={busy}
                    className="flex items-center justify-center gap-1 px-5 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Voltar
                  </button>
                )}
                {view === 'consent' && (
                  <button
                    type="button"
                    onClick={handleAcceptConsent}
                    disabled={busy}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 disabled:opacity-70"
                  >
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continuar'}
                  </button>
                )}
                {view === 'chapter' && (
                  <button
                    type="button"
                    onClick={handleContinueChapter}
                    disabled={busy}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 disabled:opacity-70"
                  >
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continuar'}
                  </button>
                )}
                {view === 'memories' && (
                  <button
                    type="button"
                    onClick={handleFinishMemories}
                    disabled={busy}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 disabled:opacity-70"
                  >
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Concluir minha história'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
