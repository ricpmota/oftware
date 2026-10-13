'use client';

import { BookMarked, BookmarkPlus } from 'lucide-react';

export function WorkoutLibraryDraftActions({
  canSaveAsTemplate,
  disabled,
  compact = false,
  onImport,
  onSaveAsTemplate,
}: {
  canSaveAsTemplate: boolean;
  disabled?: boolean;
  compact?: boolean;
  onImport: () => void;
  onSaveAsTemplate: () => void;
}) {
  const btn =
    compact
      ? 'h-8 px-2.5 text-[11px]'
      : 'h-8 px-2.5 text-[11px]';
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <button
        type="button"
        onClick={onImport}
        disabled={disabled}
        className={`${btn} rounded-lg border border-[#4CCB7A]/35 bg-[#4CCB7A]/10 text-[#4CCB7A] font-semibold hover:bg-[#4CCB7A]/15 disabled:opacity-45 inline-flex items-center justify-center gap-1`}
      >
        <BookMarked className="w-3.5 h-3.5" />
        Puxar da Biblioteca
      </button>
      <button
        type="button"
        onClick={onSaveAsTemplate}
        disabled={disabled || !canSaveAsTemplate}
        title={
          canSaveAsTemplate
            ? 'Salvar este treino como modelo na biblioteca'
            : 'Adicione pelo menos um exercício antes de salvar como modelo.'
        }
        className={`${btn} rounded-lg border border-white/15 bg-white/10 text-[#E8EDED]/85 font-semibold hover:bg-white/15 disabled:opacity-45 inline-flex items-center justify-center gap-1`}
      >
        <BookmarkPlus className="w-3.5 h-3.5" />
        Salvar como modelo
      </button>
    </div>
  );
}

export default WorkoutLibraryDraftActions;
