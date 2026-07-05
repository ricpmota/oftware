'use client';

import { ClipboardList, Folder, MessageCircleQuestion } from 'lucide-react';

export type AlunoResourceFolderId = 'montar' | 'chat';

interface AlunoResourceFoldersProps {
  active: AlunoResourceFolderId;
  onChange: (id: AlunoResourceFolderId) => void;
}

const FOLDERS: Array<{
  id: AlunoResourceFolderId;
  label: string;
  description: string;
  icon: typeof Folder;
  accent: string;
  tab: string;
}> = [
  {
    id: 'montar',
    label: 'Montar Simulados',
    description: 'Busca inteligente e lista por assunto',
    icon: ClipboardList,
    accent: 'from-violet-500 to-indigo-600',
    tab: 'bg-violet-600',
  },
  {
    id: 'chat',
    label: 'Chat Dúvidas',
    description: 'Pergunte à IA e receba sugestão de simulado',
    icon: MessageCircleQuestion,
    accent: 'from-sky-500 to-blue-600',
    tab: 'bg-sky-600',
  },
];

export default function AlunoResourceFolders({ active, onChange }: AlunoResourceFoldersProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {FOLDERS.map((folder) => {
        const isActive = active === folder.id;
        const Icon = folder.icon;
        return (
          <button
            key={folder.id}
            type="button"
            onClick={() => onChange(folder.id)}
            aria-pressed={isActive}
            className={`group relative text-left rounded-2xl border transition-all ${
              isActive
                ? `border-gray-300 bg-white shadow-md ring-2 ring-offset-2 ${
                    folder.id === 'chat' ? 'ring-sky-300' : 'ring-violet-300'
                  }`
                : 'border-gray-200 bg-gray-50/80 hover:bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div
              className={`h-2 rounded-t-2xl ${folder.tab} ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-90'}`}
              aria-hidden
            />
            <div className="p-4 sm:p-5 flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${folder.accent} text-white shadow-sm`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Folder
                    className={`h-4 w-4 shrink-0 ${isActive ? 'text-violet-600' : 'text-gray-400'}`}
                  />
                  <p className="font-semibold text-gray-900">{folder.label}</p>
                </div>
                <p className="mt-1 text-sm text-gray-600">{folder.description}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
