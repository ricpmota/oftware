'use client';

import { Construction } from 'lucide-react';
import type { LaudoGuiadoExamOption } from '@/types/oftpay/laudoGuiado';

interface LaudoGuiadoUnderConstructionProps {
  exam: LaudoGuiadoExamOption;
}

export default function LaudoGuiadoUnderConstruction({ exam }: LaudoGuiadoUnderConstructionProps) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
        <Construction className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">{exam.label}</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        Este módulo de laudo guiado está em fase de construção.
      </p>
      <p className="mt-1 text-sm text-gray-500">
        Em breve você poderá preencher o laudo de {exam.label.toLowerCase()} por aqui, no mesmo
        padrão do Mapeamento de Retina.
      </p>
      <p className="mt-6 rounded-lg border border-violet-100 bg-violet-50 px-4 py-2 text-xs text-violet-800">
        Por enquanto, utilize <strong className="font-medium">Mapeamento Retina</strong> no menu
        acima.
      </p>
    </div>
  );
}
