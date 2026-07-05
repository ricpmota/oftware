'use client';

import { Loader2 } from 'lucide-react';

type Props = {
  backgroundColor?: string;
  message?: string;
  spinnerClassName?: string;
  messageClassName?: string;
};

export default function PageLoadingScreen({
  backgroundColor = '#f9fafb',
  message = 'Carregando...',
  spinnerClassName = 'text-green-600',
  messageClassName = 'text-gray-600',
}: Props) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 px-6"
      style={{ backgroundColor }}
    >
      <Loader2 className={`h-12 w-12 animate-spin ${spinnerClassName}`} aria-hidden />
      <p className={`text-sm sm:text-base tracking-wide ${messageClassName}`}>{message}</p>
    </div>
  );
}
