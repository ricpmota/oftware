'use client';

import type { ReactNode, MouseEvent } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  children: ReactNode;
  onClose: () => void;
  labelledBy?: string;
  size?: 'card' | 'wide';
};

/**
 * Overlay do Check-in Semanal acima do modal do paciente (z-9999 / 10050).
 * Mobile: tela cheia. Tablet: painel largo com margem. Desktop: modal centralizado.
 */
export function CheckInSemanalNutriOverlay({ children, onClose, labelledBy, size = 'card' }: Props) {
  if (typeof document === 'undefined') return null;

  const closeFromBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  const panelClass =
    size === 'wide'
      ? 'relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white md:h-[min(94vh,calc(100dvh-2rem))] md:max-w-[min(64rem,calc(100vw-2rem))] md:rounded-2xl md:shadow-2xl xl:h-[min(92vh,56rem)] xl:max-w-5xl'
      : 'relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-white md:h-[min(94vh,calc(100dvh-2rem))] md:max-w-[min(48rem,calc(100vw-2rem))] md:rounded-2xl md:shadow-2xl xl:h-[min(92vh,52rem)] xl:max-w-3xl';

  return createPortal(
    <div
      className="fixed inset-0 z-[10100] flex items-stretch justify-center bg-black/50 md:items-center md:p-4 xl:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : 'Check-in Semanal Nutri'}
      onClick={closeFromBackdrop}
    >
      <div className={panelClass} onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}
