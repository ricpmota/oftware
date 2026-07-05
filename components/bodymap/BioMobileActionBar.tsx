'use client';

import { Upload } from 'lucide-react';

export interface BioMobileActionBarProps {
  onImport: () => void;
}

export function BioMobileActionBar({ onImport }: BioMobileActionBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] border-t border-gray-200 bg-white/95 backdrop-blur-md px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] lg:hidden"
      role="toolbar"
      aria-label="Ações de bioimpedância"
    >
      <button
        type="button"
        onClick={onImport}
        className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 active:scale-[0.98] transition-transform"
      >
        <Upload className="h-4 w-4" />
        Importar exame
      </button>
    </div>
  );
}
