'use client';

import { Plus, MoreVertical, Pencil, Trash2, PanelLeftClose } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { ChatConversation } from '@/types/chatConversation';

interface ChatSidebarProps {
  conversations: ChatConversation[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onCollapse?: () => void;
  loading?: boolean;
  className?: string;
}

function formatConversationDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function ChatSidebar({
  conversations,
  currentId,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onCollapse,
  loading,
  className = '',
}: ChatSidebarProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRenameClick = (c: ChatConversation) => {
    setMenuOpenId(null);
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const handleRenameSubmit = (id: string) => {
    const t = editTitle.trim();
    if (t) onRename(id, t);
    setEditingId(null);
  };

  return (
    <aside className={`flex flex-col bg-gray-50 border-r border-gray-200 w-[280px] flex-shrink-0 ${className}`}>
      <div className="flex-shrink-0 p-3 border-b border-gray-200">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-gray-900 truncate min-w-0">Chatbot Oftware</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={onNew}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova conversa
            </button>
            {onCollapse && (
              <button
                type="button"
                onClick={onCollapse}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                title="Recolher lista de conversas"
                aria-label="Recolher lista de conversas"
              >
                <PanelLeftClose className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="p-4 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            Você ainda não tem conversas.
          </div>
        ) : (
          <ul className="py-2">
            {conversations.map((c) => (
              <li key={c.id} className="relative group">
                {editingId === c.id ? (
                  <div className="px-3 py-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit(c.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={() => handleRenameSubmit(c.id)}
                      className="flex-1 min-w-0 rounded border border-gray-300 px-2 py-1 text-sm"
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-2 rounded-none transition-colors ${
                      currentId === c.id
                        ? 'bg-blue-100 text-blue-900 border-l-2 border-blue-600'
                        : 'hover:bg-gray-100 text-gray-800'
                    }`}
                  >
                    <span className="truncate flex-1 min-w-0 text-sm">{c.title}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">{formatConversationDate(c.updatedAt)}</span>
                    <div className="flex-shrink-0 relative" ref={menuRef}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === c.id ? null : c.id);
                        }}
                        className="p-1 rounded hover:bg-gray-200 text-gray-500"
                        aria-label="Opções"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {menuOpenId === c.id && (
                        <div className="absolute right-0 top-full mt-0.5 py-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[140px]">
                          <button
                            type="button"
                            onClick={() => handleRenameClick(c)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil className="w-4 h-4" />
                            Renomear
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenId(null);
                              onDelete(c.id);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
