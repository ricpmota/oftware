'use client';

import { useState } from 'react';
import Image from 'next/image';

export interface AIThinkingIndicatorProps {
  message?: string;
}

export default function AIThinkingIndicator({ message }: AIThinkingIndicatorProps) {
  const [imgError, setImgError] = useState(false);
  const displayMessage = message ?? 'Oftware AI analisando conteúdo';

  return (
    <div className="flex justify-start w-full">
      <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200/90 bg-white/80 px-3 py-2 shadow-sm">
        {/* Logo pequena, discreta, sem glow */}
        <div className="flex-shrink-0 h-5 w-5 opacity-80 flex items-center justify-center overflow-hidden rounded">
          {!imgError ? (
            <Image
              src="/logo-oftware.png"
              alt="Oftware"
              width={20}
              height={20}
              className="object-contain h-5 w-5"
              unoptimized
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-slate-500 font-medium text-xs">O</span>
          )}
        </div>
        {/* Texto com pulse lento (opacity 0.55 → 1 → 0.55, 2.5s) */}
        <p className="text-sm text-slate-700 animate-slow-pulse-opacity whitespace-nowrap min-w-0 truncate max-w-[220px] sm:max-w-none">
          {displayMessage}
        </p>
      </div>
    </div>
  );
}
