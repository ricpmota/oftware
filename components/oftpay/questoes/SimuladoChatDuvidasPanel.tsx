'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { auth } from '@/lib/firebase';
import { maxSimuladoQuantidade } from '@/lib/oftpay/simuladoSubjectListPicker';
import type { OftpayQuestaoDoc } from '@/services/oftpayQuestoesService';
import type { OftpaySimuladoSelection } from '@/types/oftpaySimulados';
import {
  countAvailableForTopicAndDifficulty,
  DIFICULDADE_LABEL,
  getSelectionLabel,
} from '@/types/oftpaySimulados';
import type { QuestaoDificuldade } from '@/types/oftpayQuestoes';
import {
  AlertCircle,
  ImagePlus,
  Loader2,
  MessageCircleQuestion,
  Play,
  Send,
  Sparkles,
  X,
} from 'lucide-react';

const DIFFICULTIES: QuestaoDificuldade[] = ['facil', 'medio', 'dificil'];
const CHAT_DUVIDAS_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const CHAT_DUVIDAS_MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ACCEPT_IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

function applyDificuldadeToSelections(
  selections: OftpaySimuladoSelection[],
  dificuldade: QuestaoDificuldade,
  publicadas: OftpayQuestaoDoc[]
): OftpaySimuladoSelection[] {
  return selections
    .map((sel) => {
      const capituloTitulo = sel.capituloTitulo?.trim();
      if (!capituloTitulo) return null;
      const apostilaTitulo = sel.apostilaTitulo?.trim();
      const disponiveis = countAvailableForTopicAndDifficulty(
        publicadas,
        capituloTitulo,
        dificuldade,
        apostilaTitulo || undefined
      );
      if (disponiveis <= 0) return null;
      const quantidade = Math.max(
        1,
        Math.min(sel.quantidade, disponiveis, maxSimuladoQuantidade(disponiveis))
      );
      return {
        ...sel,
        ...(apostilaTitulo ? { apostilaTitulo } : {}),
        capituloTitulo,
        dificuldade,
        quantidade,
      };
    })
    .filter(Boolean) as OftpaySimuladoSelection[];
}

function pickDefaultDificuldade(
  selections: OftpaySimuladoSelection[],
  publicadas: OftpayQuestaoDoc[]
): QuestaoDificuldade | null {
  for (const diff of DIFFICULTIES) {
    if (applyDificuldadeToSelections(selections, diff, publicadas).length > 0) {
      return diff;
    }
  }
  return null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imagePreviewUrl?: string;
}

interface PendingImage {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

export interface ChatDuvidasSimuladoSuggestion {
  title: string;
  selections: OftpaySimuladoSelection[];
}

interface SimuladoChatDuvidasPanelProps {
  publicadas: OftpayQuestaoDoc[];
  onCreateSimulado: (
    selections: OftpaySimuladoSelection[],
    title: string
  ) => Promise<void>;
  creatingSimulado?: boolean;
}

export default function SimuladoChatDuvidasPanel({
  publicadas,
  onCreateSimulado,
  creatingSimulado = false,
}: SimuladoChatDuvidasPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Olá! Tire dúvidas sobre qualquer tema das apostilas ou envie uma imagem (exame, fundo de olho, OCT). Vou interpretar, buscar base nos tópicos mapeados e sugerir um simulado quando houver questões.',
    },
  ]);
  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingWithImage, setLoadingWithImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<ChatDuvidasSimuladoSuggestion | null>(null);
  const [selectedDificuldade, setSelectedDificuldade] = useState<QuestaoDificuldade | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!suggestion) {
      setSelectedDificuldade(null);
      return;
    }
    setSelectedDificuldade(pickDefaultDificuldade(suggestion.selections, publicadas));
  }, [suggestion, publicadas]);

  const selectionsForDifficulty = useMemo(() => {
    if (!suggestion || !selectedDificuldade) return [];
    return applyDificuldadeToSelections(suggestion.selections, selectedDificuldade, publicadas);
  }, [suggestion, selectedDificuldade, publicadas]);

  const difficultyAvailability = useMemo(() => {
    if (!suggestion) return [];
    return DIFFICULTIES.map((diff) => {
      const applied = applyDificuldadeToSelections(suggestion.selections, diff, publicadas);
      const total = applied.reduce((sum, sel) => sum + sel.quantidade, 0);
      return { diff, total, hasTopics: applied.length > 0 };
    });
  }, [suggestion, publicadas]);

  const totalQuestoesSugeridas = useMemo(
    () => selectionsForDifficulty.reduce((sum, sel) => sum + sel.quantidade, 0),
    [selectionsForDifficulty]
  );

  const clearPendingImage = () => {
    setPendingImage((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageSelect = async (file: File | null) => {
    if (!file) return;
    setError(null);

    const mimeType = file.type.split(';')[0].trim().toLowerCase();
    if (!CHAT_DUVIDAS_IMAGE_MIMES.has(mimeType)) {
      setError('Use imagem JPEG, PNG ou WebP.');
      return;
    }
    if (file.size > CHAT_DUVIDAS_MAX_IMAGE_BYTES) {
      setError('Imagem muito grande. Máximo 4 MB.');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
      if (!base64) {
        setError('Não foi possível processar a imagem.');
        return;
      }

      setPendingImage((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return {
          file,
          previewUrl: URL.createObjectURL(file),
          base64,
          mimeType,
        };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar imagem.');
    }
  };

  const sendQuestion = async (text: string, image?: PendingImage | null) => {
    const question = text.trim();
    const imageToSend = image ?? null;
    if ((!question && !imageToSend) || loading) return;

    const imagePreviewUrl = imageToSend?.previewUrl;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: question || '📷 Imagem enviada para análise',
      imagePreviewUrl,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setPendingImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setError(null);
    setSuggestion(null);
    setSelectedDificuldade(null);
    setLoadingWithImage(Boolean(imageToSend));
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        setError('Faça login para usar o chat.');
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch('/api/oftpay/questoes/chat-duvidas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...(question ? { question } : {}),
          ...(imageToSend
            ? { image: { data: imageToSend.base64, mimeType: imageToSend.mimeType } }
            : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Não foi possível obter resposta.');
        return;
      }

      const answer = typeof data.answer === 'string' ? data.answer : '';
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: answer || 'Não consegui elaborar uma resposta. Tente reformular a pergunta.',
        },
      ]);

      if (data.simuladoSuggestion?.selections?.length) {
        setSuggestion(data.simuladoSuggestion as ChatDuvidasSimuladoSuggestion);
      }

      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro de conexão.');
    } finally {
      setLoading(false);
      setLoadingWithImage(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-sky-50/80 to-blue-50/50">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <MessageCircleQuestion className="w-4 h-4 text-sky-600" />
          Chat Dúvidas
        </h3>
        <p className="text-sm text-gray-600 mt-0.5">
          Pergunte sobre qualquer assunto ou envie uma imagem — a IA interpreta e busca nos tópicos
          mapeados.
        </p>
      </div>

      <div ref={listRef} className="h-[min(420px,50vh)] overflow-y-auto px-4 sm:px-5 py-4 space-y-3 bg-gray-50/40">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[92%] sm:max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-sky-600 text-white rounded-br-md'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
              }`}
            >
              {msg.imagePreviewUrl && (
                <img
                  src={msg.imagePreviewUrl}
                  alt="Imagem enviada"
                  className="mb-2 max-h-40 rounded-lg border border-white/30 object-contain"
                />
              )}
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
            {loadingWithImage
              ? 'Interpretando imagem e consultando material mapeado…'
              : 'Consultando material mapeado…'}
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 sm:mx-5 mb-3 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {suggestion && (
        <div className="mx-4 sm:mx-5 mb-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
          <div className="flex items-start gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-violet-900">Simulado sugerido</p>
              <p className="text-xs text-violet-800 mt-0.5">{suggestion.title}</p>
            </div>
          </div>
          <div className="mb-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-violet-800/80 mb-1.5">
              Nível das questões
            </p>
            <div className="flex flex-wrap gap-1.5">
              {difficultyAvailability.map(({ diff, total, hasTopics }) => {
                const active = selectedDificuldade === diff;
                return (
                  <button
                    key={diff}
                    type="button"
                    disabled={!hasTopics}
                    onClick={() => setSelectedDificuldade(diff)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                      active
                        ? 'border-violet-500 bg-violet-600 text-white shadow-sm'
                        : !hasTopics
                          ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                          : 'border-violet-200 bg-white text-violet-900 hover:border-violet-400 hover:bg-violet-100/50'
                    }`}
                    title={
                      !hasTopics
                        ? `Sem questões ${DIFICULDADE_LABEL[diff].toLowerCase()} nos tópicos sugeridos`
                        : `${total} questão(ões) disponível(is)`
                    }
                  >
                    {DIFICULDADE_LABEL[diff]}
                    <span
                      className={`ml-1 tabular-nums ${active ? 'text-violet-100' : 'text-violet-500/70'}`}
                    >
                      ({total})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <ul className="text-xs text-violet-900/90 space-y-1 mb-3">
            {selectionsForDifficulty.map((sel, idx) => (
              <li key={idx}>
                • {getSelectionLabel(sel)} — {sel.quantidade}{' '}
                {sel.quantidade === 1 ? 'questão' : 'questões'}
              </li>
            ))}
            {selectedDificuldade && selectionsForDifficulty.length === 0 && (
              <li className="text-amber-800">
                Nenhuma questão {DIFICULDADE_LABEL[selectedDificuldade].toLowerCase()} disponível
                para os tópicos sugeridos.
              </li>
            )}
          </ul>
          <button
            type="button"
            disabled={creatingSimulado || selectionsForDifficulty.length === 0}
            onClick={() =>
              onCreateSimulado(selectionsForDifficulty, suggestion.title)
            }
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 text-white px-4 py-2 text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
          >
            {creatingSimulado ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando…
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Gerar simulado sugerido ({totalQuestoesSugeridas}{' '}
                {totalQuestoesSugeridas === 1 ? 'questão' : 'questões'})
              </>
            )}
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendQuestion(input, pendingImage);
        }}
        className="border-t border-gray-100 p-4 bg-white space-y-3"
      >
        {pendingImage && (
          <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50/50 p-3">
            <img
              src={pendingImage.previewUrl}
              alt="Pré-visualização"
              className="h-20 w-20 rounded-lg object-cover border border-sky-100"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{pendingImage.file.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                A IA vai interpretar a imagem e buscar conteúdo relacionado nas apostilas.
              </p>
            </div>
            <button
              type="button"
              onClick={clearPendingImage}
              className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50"
              aria-label="Remover imagem"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_IMAGE_TYPES}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              void handleImageSelect(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-50"
            aria-label="Anexar imagem"
            title="Anexar imagem (JPEG, PNG ou WebP)"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunta ou contexto sobre a imagem…"
            disabled={loading}
            className="flex-1 min-w-0 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:bg-gray-50"
          />
          <button
            type="submit"
            disabled={loading || (!input.trim() && !pendingImage)}
            className="inline-flex items-center justify-center rounded-xl bg-sky-600 text-white px-4 py-2.5 hover:bg-sky-700 disabled:opacity-50"
            aria-label="Enviar"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
