'use client';

import type { LucideIcon } from 'lucide-react';
import { Scale } from 'lucide-react';
import { BIO_CARD, BIO_CARD_PAD } from '@/components/bodymap/bioImpedanciaTokens';

export interface BioEmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export function BioEmptyState({ title, description, icon: Icon = Scale, action }: BioEmptyStateProps) {
  return (
    <div className={`${BIO_CARD} ${BIO_CARD_PAD} text-center`}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 border border-gray-100 mb-3">
        <Icon className="h-5 w-5 text-gray-400" />
      </div>
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      {description && <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
