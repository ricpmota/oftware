'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { CINQUENTA_KG_DEPOIS_INTERVIEW_CHAPTERS } from '@/lib/50kgdepois/interviewChapters';
import type { CinquentaKgDepoisSessionPayload } from '@/types/cinquentaKgDepois';

type AnswerFilter = 'all' | 'answered' | 'pending';

type CinquentaKgDepoisResponsesPanelProps = {
  session: CinquentaKgDepoisSessionPayload;
  variant?: 'light' | 'dark';
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso || '—';
  }
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export default function CinquentaKgDepoisResponsesPanel({
  session,
  variant = 'light',
}: CinquentaKgDepoisResponsesPanelProps) {
  const isDark = variant === 'dark';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AnswerFilter>('all');
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = { memories: true };
    for (const ch of CINQUENTA_KG_DEPOIS_INTERVIEW_CHAPTERS) {
      initial[ch.id] = ch.number <= 2;
    }
    return initial;
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const normalizedSearch = search.trim().toLowerCase();

  const chapterBlocks = useMemo(() => {
    return CINQUENTA_KG_DEPOIS_INTERVIEW_CHAPTERS.map((chapter) => {
      const items = chapter.questions
        .map((question) => {
          const record = session.answers[question.id];
          const answer = record?.answer?.trim() || '';
          const answered = answer.length > 0;
          const pending = !answered && !record?.skipped;
          return { question, record, answer, answered, pending };
        })
        .filter((item) => {
          if (filter === 'answered' && !item.answered) return false;
          if (filter === 'pending' && !item.pending) return false;
          if (!normalizedSearch) return true;
          const hay = `${item.question.text} ${item.answer}`.toLowerCase();
          return hay.includes(normalizedSearch);
        });

      return { chapter, items };
    }).filter((block) => block.items.length > 0);
  }, [session, filter, normalizedSearch]);

  const shell = isDark
    ? 'rounded-2xl border border-white/10 bg-white/5'
    : 'rounded-2xl border border-slate-200 bg-white shadow-sm';
  const textPrimary = isDark ? 'text-[#E8EDED]' : 'text-slate-900';
  const textMuted = isDark ? 'text-[#E8EDED]/60' : 'text-slate-500';
  const textSoft = isDark ? 'text-[#E8EDED]/85' : 'text-slate-700';
  const inputClass = isDark
    ? 'w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/40'
    : 'w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400';
  const filterBtn = (active: boolean) =>
    isDark
      ? active
        ? 'bg-[#4CCB7A]/25 text-[#4CCB7A]'
        : 'bg-white/5 text-[#E8EDED]/70 hover:bg-white/10'
      : active
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-white text-slate-600 hover:bg-slate-50';

  const handleCopyAnswer = async (id: string, text: string) => {
    await copyText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCopyChapter = async (
    chapterId: string,
    items: { question: { text: string }; answer: string }[]
  ) => {
    const text = items
      .map((item) => `PERGUNTA\n${item.question.text}\n\nResposta de Antônio\n${item.answer || '—'}`)
      .join('\n\n---\n\n');
    await copyText(text);
    setCopiedId(`chapter-${chapterId}`);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${textPrimary}`}>{session.participant.participantName}</h1>
        <p className={`text-sm ${textMuted}`}>{session.participant.weightJourneyLabel}</p>
        <p className={`mt-2 text-xs ${textMuted}`}>
          Progresso: {session.participant.progressPercent}% · Atualizado em{' '}
          {formatDateTime(session.participant.updatedAt)}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar palavras nas perguntas e respostas..."
            className={inputClass}
          />
        </div>
        <div
          className={`inline-flex rounded-xl border overflow-hidden text-xs ${
            isDark ? 'border-white/10' : 'border-slate-200'
          }`}
        >
          {([
            ['all', 'Todas'],
            ['answered', 'Respondidas'],
            ['pending', 'Pendentes'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`px-3 py-2.5 ${filterBtn(filter === value)}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {chapterBlocks.map(({ chapter, items }) => {
          const open = openChapters[chapter.id] ?? false;
          return (
            <section key={chapter.id} className={shell}>
              <div className="w-full flex items-center justify-between gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setOpenChapters((prev) => ({ ...prev, [chapter.id]: !open }))}
                  className={`flex items-center gap-2 min-w-0 flex-1 text-left ${isDark ? 'hover:opacity-90' : 'hover:bg-slate-50 rounded-lg'}`}
                >
                  {open ? (
                    <ChevronDown className={`w-4 h-4 shrink-0 ${textMuted}`} />
                  ) : (
                    <ChevronRight className={`w-4 h-4 shrink-0 ${textMuted}`} />
                  )}
                  <span className={`font-medium truncate ${textPrimary}`}>
                    {String(chapter.number).padStart(2, '0')}. {chapter.title}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopyChapter(chapter.id, items)}
                  className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 shrink-0"
                >
                  {copiedId === `chapter-${chapter.id}` ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  Copiar capítulo
                </button>
              </div>

              {open && (
                <div className={`border-t divide-y ${isDark ? 'border-white/10 divide-white/5' : 'border-slate-100 divide-slate-100'}`}>
                  {items.map(({ question, record, answer }) => (
                    <div key={question.id} className="px-4 py-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <p className={`text-xs font-semibold tracking-wide uppercase ${textMuted}`}>Pergunta</p>
                        <button
                          type="button"
                          onClick={() => void handleCopyAnswer(question.id, answer)}
                          className="inline-flex items-center gap-1 text-xs text-emerald-600"
                        >
                          {copiedId === question.id ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          Copiar
                        </button>
                      </div>
                      <p className={`text-sm whitespace-pre-wrap ${textSoft}`}>{question.text}</p>
                      <p className={`text-xs font-semibold tracking-wide uppercase pt-2 ${textMuted}`}>
                        Resposta de Antônio
                      </p>
                      <p className={`text-sm whitespace-pre-wrap leading-relaxed ${textPrimary}`}>
                        {answer || (record?.skipped ? '— (marcada para responder depois)' : '—')}
                      </p>
                      <p className={`text-[11px] ${textMuted}`}>
                        Atualizado: {formatDateTime(record?.updatedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {session.memories.length > 0 && (
          <section className={shell}>
            <button
              type="button"
              onClick={() => setOpenChapters((prev) => ({ ...prev, memories: !prev.memories }))}
              className={`w-full flex items-center gap-2 px-4 py-3 text-left ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
            >
              {openChapters.memories ? (
                <ChevronDown className={`w-4 h-4 ${textMuted}`} />
              ) : (
                <ChevronRight className={`w-4 h-4 ${textMuted}`} />
              )}
              <span className={`font-medium ${textPrimary}`}>Memórias livres</span>
            </button>
            {openChapters.memories && (
              <div className={`border-t divide-y ${isDark ? 'border-white/10 divide-white/5' : 'border-slate-100 divide-slate-100'}`}>
                {session.memories.map((memory) => (
                  <div key={memory.id} className="px-4 py-4 space-y-2">
                    <p className={`text-sm font-medium ${textPrimary}`}>
                      {memory.title || 'Memória sem título'}
                    </p>
                    <p className={`text-sm whitespace-pre-wrap ${textSoft}`}>{memory.text || '—'}</p>
                    <p className={`text-xs ${textMuted}`}>
                      {[memory.approxDate, memory.lifePhase].filter(Boolean).join(' · ') || '—'}
                    </p>
                    <p className={`text-[11px] ${textMuted}`}>
                      Atualizado: {formatDateTime(memory.updatedAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
