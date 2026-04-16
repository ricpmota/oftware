'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import ExportPdfButton from './ExportPdfButton';
import type { ChatMessage } from '@/types/chatConversation';

interface ChatHeaderProps {
  title: string;
  onRename?: (newTitle: string) => void;
  messages: ChatMessage[];
  conversationDate?: Date;
  isMobile?: boolean;
  onMenuClick?: () => void;
}

export default function ChatHeader({
  title,
  onRename,
  messages,
  conversationDate,
  isMobile,
  onMenuClick,
}: ChatHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(title);
  }, [title]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleBlur = () => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== title && onRename) onRename(trimmed);
    else setEditValue(title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    }
  };

  return (
    <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 bg-gray-50">
      {isMobile && onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 -ml-1"
          aria-label="Abrir menu de conversas"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}
      <MessageCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
      <div className="min-w-0 flex-1 flex items-center gap-2">
        {editing && onRename ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-0 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Título da conversa"
          />
        ) : (
          <button
            type="button"
            onClick={() => onRename && setEditing(true)}
            className="text-left font-medium text-gray-900 truncate hover:text-blue-600 focus:outline-none focus:underline"
            title={onRename ? 'Clique para renomear' : title}
          >
            {title}
          </button>
        )}
        {conversationDate && (
          <span className="text-xs text-gray-500 flex-shrink-0">
            {conversationDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>
      <ExportPdfButton
        messages={messages}
        title={title}
        date={conversationDate ?? new Date()}
        disabled={messages.length === 0}
        className="flex-shrink-0"
      />
    </div>
  );
}
