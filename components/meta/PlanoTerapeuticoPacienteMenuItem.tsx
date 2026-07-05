'use client';

import { ClipboardList } from 'lucide-react';

export type PlanoTerapeuticoPacienteMenuItemProps = {
  onClick: () => void;
  className?: string;
  iconClassName?: string;
};

export default function PlanoTerapeuticoPacienteMenuItem({
  onClick,
  className = 'w-full flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
  iconClassName = 'w-5 h-5 mr-3 text-gray-600 dark:text-gray-400',
}: PlanoTerapeuticoPacienteMenuItemProps) {
  return (
    <button type="button" onClick={onClick} className={className}>
      <ClipboardList className={iconClassName} aria-hidden />
      Plano terapêutico
    </button>
  );
}
