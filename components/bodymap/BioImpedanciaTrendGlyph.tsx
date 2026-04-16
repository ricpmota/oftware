'use client';

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { BioTrendDir } from '@/utils/bioImpedanciaTrend';

export function BioImpedanciaTrendGlyph({ dir }: { dir: BioTrendDir }) {
  if (dir === 'none') {
    return <span className="inline-block w-5 shrink-0" aria-hidden />;
  }
  if (dir === 'same') {
    return (
      <Minus className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2.5} aria-hidden title="Igual ao exame anterior" />
    );
  }
  if (dir === 'up') {
    return (
      <ArrowUp className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2.5} aria-hidden title="Subiu vs. exame anterior" />
    );
  }
  return (
    <ArrowDown className="w-4 h-4 text-amber-600 shrink-0" strokeWidth={2.5} aria-hidden title="Desceu vs. exame anterior" />
  );
}
