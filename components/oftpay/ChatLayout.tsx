'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isMobile;
}
import { PanelRightOpen } from 'lucide-react';
import ChatSidebar from './ChatSidebar';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatComposer from './ChatComposer';
import AIThinkingIndicator from './AIThinkingIndicator';
import {
  listConversations,
  getConversation,
  getMessages,
  createConversation,
  renameConversation,
  deleteConversation,
  appendMessage,
  touchConversation,
} from '@/services/chatConversationService';
import type { ChatConversation, ChatMessage, ChatConversationSource } from '@/types/chatConversation';
import { DEFAULT_CONVERSATION_TITLE } from '@/types/chatConversation';

export type ChatLayoutSurface = 'general' | 'chatnutri';

interface ChatLayoutProps {
  courseId?: string;
  /** Padrão: fluxo Discovery + apostilas. `chatnutri` usa o mesmo endpoint com pipeline nutricional (exige nutriPatientId + nutriDateKey). */
  surface?: ChatLayoutSurface;
  nutriPatientId?: string;
  nutriDateKey?: string;
}

const ANON_USER_ID = 'anon';

export default function ChatLayout({
  courseId = 'oftreview',
  surface = 'general',
  nutriPatientId,
  nutriDateKey,
}: ChatLayoutProps) {
  const [userId, setUserId] = useState<string>(ANON_USER_ID);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourcesModalFor, setSourcesModalFor] = useState<ChatConversationSource[] | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [input, setInput] = useState('');

  const isPropedeutics = courseId?.toLowerCase() === 'propedeutics';

  // Auth: use Firebase uid or fallback to anon (localStorage)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? ANON_USER_ID);
    });
    return () => unsub();
  }, []);

  // Load conversations when userId is set
  useEffect(() => {
    let cancelled = false;
    setListLoading(true);
    listConversations(userId)
      .then((list) => {
        if (!cancelled) setConversations(list);
      })
      .catch((e) => {
        if (!cancelled) setError('Erro ao carregar conversas.');
        console.error(e);
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  // Open most recent or create new when list is loaded and currentId is unset
  useEffect(() => {
    if (listLoading || currentId !== null) return;
    if (conversations.length > 0) {
      setCurrentId(conversations[0].id);
    } else {
      createConversation(userId).then((conv) => {
        setConversations((prev) => [conv, ...prev]);
        setCurrentId(conv.id);
      }).catch(() => setError('Erro ao criar conversa.'));
    }
  }, [listLoading, conversations.length, currentId, userId]);

  // Load messages when current conversation changes
  useEffect(() => {
    if (!currentId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setMessagesLoading(true);
    getMessages(userId, currentId)
      .then((list) => {
        if (!cancelled) setMessages(list);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      })
      .finally(() => {
        if (!cancelled) setMessagesLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId, currentId]);

  const currentConversation = conversations.find((c) => c.id === currentId);
  const currentTitle = currentConversation?.title ?? DEFAULT_CONVERSATION_TITLE;
  const currentDate = currentConversation ? new Date(currentConversation.updatedAt) : undefined;

  const handleSelectConversation = useCallback((id: string) => {
    setCurrentId(id);
    setSidebarOpen(false);
  }, []);

  const handleNewConversation = useCallback(async () => {
    setError(null);
    try {
      const conv = await createConversation(userId);
      setConversations((prev) => [conv, ...prev]);
      setCurrentId(conv.id);
      setMessages([]);
      setSidebarOpen(false);
    } catch {
      setError('Erro ao criar conversa.');
    }
  }, [userId]);

  const handleRename = useCallback(
    async (id: string, newTitle: string) => {
      const t = newTitle.trim() || DEFAULT_CONVERSATION_TITLE;
      try {
        await renameConversation(userId, id, t);
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: t, updatedAt: Date.now() } : c))
        );
      } catch {
        setError('Erro ao renomear.');
      }
    },
    [userId]
  );

  const handleRenameFromHeader = useCallback(
    (newTitle: string) => {
      if (currentId) handleRename(currentId, newTitle);
    },
    [currentId, handleRename]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteConversation(userId, id);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (currentId === id) {
          const rest = conversations.filter((c) => c.id !== id);
          if (rest.length > 0) {
            setCurrentId(rest[0].id);
          } else {
            setCurrentId(null);
            setMessages([]);
            const conv = await createConversation(userId);
            setConversations((prev) => [conv, ...prev]);
            setCurrentId(conv.id);
          }
        }
      } catch {
        setError('Erro ao excluir.');
      }
    },
    [userId, currentId, conversations]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || typing || isPropedeutics) return;
      if (!currentId) return;
      if (surface === 'chatnutri' && (!nutriPatientId?.trim() || !nutriDateKey?.trim())) {
        setError('Para este modo é necessário paciente e data do dia.');
        return;
      }

      setInput('');
      setError(null);
      const userMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversationId: currentId,
        role: 'user',
        content: trimmed,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setTyping(true);

      try {
        await appendMessage(userId, currentId, { role: 'user', content: trimmed });
        await touchConversation(userId, currentId);

        const payload: Record<string, unknown> = {
          message: trimmed,
          sessionId: '-',
          conversationId: currentId,
          surface,
        };
        if (surface === 'chatnutri' && nutriPatientId && nutriDateKey) {
          payload.patientId = nutriPatientId;
          payload.dateKey = nutriDateKey;
        }

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const errMsg = typeof data.error === 'string' ? data.error : 'Não foi possível obter resposta.';
          setError(errMsg);
          setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
          return;
        }

        const answer = typeof data.answer === 'string' ? data.answer : 'Resposta indisponível.';
        const sourcesRaw = Array.isArray(data.sources) ? data.sources : [];
        const sources: ChatConversationSource[] = sourcesRaw
          .filter((s: unknown) => s && typeof s === 'object' && 'title' in s)
          .map((s: { id?: number; title: string; snippet?: string; page?: number; url?: string }) => ({
            title: String(s.title),
            ...(typeof s.snippet === 'string' && { snippet: s.snippet }),
            ...(typeof s.page === 'number' && { page: s.page }),
            ...(typeof s.url === 'string' && { url: s.url }),
            ...(typeof (s as { id?: number }).id === 'number' && { id: (s as { id: number }).id }),
          }));

        const assistantMsg = await appendMessage(userId, currentId, {
          role: 'assistant',
          content: answer,
          sources: sources.length ? sources : undefined,
        });
        await touchConversation(userId, currentId);

        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== userMsg.id);
          return [...withoutTemp, { ...userMsg, id: userMsg.id }, { ...assistantMsg }];
        });

        // Auto-rename from first user message if still default title
        if (currentConversation?.title === DEFAULT_CONVERSATION_TITLE) {
          const newTitle = trimmed.length > 50 ? trimmed.slice(0, 47) + '...' : trimmed;
          await renameConversation(userId, currentId, newTitle);
          setConversations((prev) =>
            prev.map((c) => (c.id === currentId ? { ...c, title: newTitle } : c))
          );
        }
      } catch (e) {
        setError('Erro de conexão. Tente novamente.');
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      } finally {
        setTyping(false);
      }
    },
    [userId, currentId, typing, isPropedeutics, currentConversation?.title, surface, nutriPatientId, nutriDateKey]
  );

  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col h-[min(70vh,600px)] md:h-[min(72vh,640px)] rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="flex flex-1 min-h-0">
        {/* Sidebar: desktop expandível/recolhível; mobile drawer */}
        <div
          className={`${
            sidebarOpen ? 'fixed inset-0 z-40 flex md:relative md:z-auto' : 'hidden md:flex'
          }`}
        >
          {/* Desktop: barra recolhida = faixa estreita com botão expandir */}
          {!isMobile && sidebarCollapsed && (
            <div className="h-full w-12 flex-shrink-0 flex flex-col items-center py-3 border-r border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                title="Expandir lista de conversas"
                aria-label="Expandir lista de conversas"
              >
                <PanelRightOpen className="w-5 h-5" />
              </button>
            </div>
          )}
          {/* Sidebar completa (desktop expandida ou mobile drawer) */}
          {(!isMobile && !sidebarCollapsed) || (isMobile && sidebarOpen) ? (
            <div className="h-full w-[280px] flex-shrink-0 bg-gray-50 md:bg-transparent z-10">
              <ChatSidebar
                conversations={conversations}
                currentId={currentId}
                onSelect={handleSelectConversation}
                onNew={handleNewConversation}
                onRename={handleRename}
                onDelete={handleDelete}
                onCollapse={!isMobile ? () => setSidebarCollapsed(true) : undefined}
                loading={listLoading}
              />
            </div>
          ) : null}
          {sidebarOpen && isMobile && (
            <div
              className="flex-1 bg-black/40"
              onClick={() => setSidebarOpen(false)}
              aria-hidden
            />
          )}
        </div>

        {/* Main chat area */}
        <div className="flex flex-col flex-1 min-w-0">
          <ChatHeader
            title={currentTitle}
            onRename={handleRenameFromHeader}
            messages={messages}
            conversationDate={currentDate}
            isMobile={isMobile}
            onMenuClick={() => setSidebarOpen(true)}
          />
          {messagesLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : (
            <ChatMessages
              messages={messages}
              sourcesModalFor={sourcesModalFor}
              onOpenSources={setSourcesModalFor}
              onCloseSources={() => setSourcesModalFor(null)}
              typing={typing}
              error={error}
              emptyMessage={
                isPropedeutics
                  ? 'O chatbot do Propedeutics está em andamento.'
                  : surface === 'chatnutri'
                    ? 'Converse sobre nutrição, hábitos ou o uso do Oftware. O contexto do dia selecionado entra automaticamente nas respostas.'
                    : 'Faça uma pergunta sobre o conteúdo das apostilas.'
              }
              ThinkingIndicator={AIThinkingIndicator}
              courseId={courseId}
            />
          )}
          {!messagesLoading && (
            <ChatComposer
              value={input}
              onChange={setInput}
              onSubmit={sendMessage}
              disabled={typing || isPropedeutics}
              placeholder={
                isPropedeutics
                  ? 'Chat em andamento...'
                  : surface === 'chatnutri'
                    ? 'Escreva sua mensagem...'
                    : 'Digite sua pergunta...'
              }
            />
          )}
        </div>
      </div>
      {error && (
        <div
          className="flex-shrink-0 px-3 py-2 text-sm text-red-700 bg-red-50 border-t border-red-100"
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
}
