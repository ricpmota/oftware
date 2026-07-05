'use client';

import type { LaudoGuiadoExamType } from '@/types/oftpay/laudoGuiado';
import { LAUDO_GUIADO_EXAM_OPTIONS } from '@/types/oftpay/laudoGuiado';

interface LaudoGuiadoExamNavProps {
  activeExam: LaudoGuiadoExamType;
  onExamChange: (exam: LaudoGuiadoExamType) => void;
}

export default function LaudoGuiadoExamNav({ activeExam, onExamChange }: LaudoGuiadoExamNavProps) {
  return (
    <nav
      className="border-b border-gray-200 bg-white"
      aria-label="Tipos de exame — laudo guiado"
    >
      <div className="mx-auto max-w-7xl overflow-x-auto px-4">
        <ul className="flex min-w-max gap-1 py-2">
          {LAUDO_GUIADO_EXAM_OPTIONS.map((option) => {
            const isActive = activeExam === option.id;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => onExamChange(option.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
