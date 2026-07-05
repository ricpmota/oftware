'use client';

import { FileSignature } from 'lucide-react';

export type ContratoPacienteMenuItemProps = {
  onClick: () => void;
  /** Classes do botão (desktop dark mode vs mobile light). */
  className?: string;
  iconClassName?: string;
};

export default function ContratoPacienteMenuItem({
  onClick,
  className = 'w-full flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
  iconClassName = 'w-5 h-5 mr-3 text-gray-600 dark:text-gray-400',
}: ContratoPacienteMenuItemProps) {
  return (
    <button type="button" onClick={onClick} className={className}>
      <FileSignature className={iconClassName} aria-hidden />
      Contrato
    </button>
  );
}
