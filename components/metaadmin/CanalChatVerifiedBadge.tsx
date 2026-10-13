'use client';

import { BadgeCheck } from 'lucide-react';

const TOOLTIP = 'Paciente confirmou conexão com o Canal Chat';

type CanalChatVerifiedBadgeProps = {
  verified?: boolean | null;
  className?: string;
};

/** Ícone positivo ao lado do nome. Ausente/false = não renderiza nada. */
export function CanalChatVerifiedBadge({ verified, className }: CanalChatVerifiedBadgeProps) {
  if (verified !== true) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center ${className ?? ''}`.trim()}
      title={TOOLTIP}
      aria-label={TOOLTIP}
    >
      <BadgeCheck className="h-4 w-4 text-state-success" aria-hidden />
    </span>
  );
}
