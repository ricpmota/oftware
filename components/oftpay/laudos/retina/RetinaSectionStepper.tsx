'use client';

import type { RetinaSection } from '@/types/oftpay/retinaMap';
import { RETINA_SECTION_LABELS, RETINA_SECTION_ORDER } from '@/types/oftpay/retinaMap';
import { Check } from 'lucide-react';

interface RetinaSectionStepperProps {
  activeSection: RetinaSection;
  onSectionChange: (section: RetinaSection) => void;
  completedSections?: Set<RetinaSection>;
}

export default function RetinaSectionStepper({
  activeSection,
  onSectionChange,
  completedSections,
}: RetinaSectionStepperProps) {
  return (
    <nav aria-label="Etapas do exame" className="space-y-1">
      {RETINA_SECTION_ORDER.map((section, index) => {
        const isActive = section === activeSection;
        const isDone = completedSections?.has(section);

        return (
          <button
            key={section}
            type="button"
            onClick={() => onSectionChange(section)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              isActive
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                isActive
                  ? 'bg-white/20 text-white'
                  : isDone
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-600'
              }`}
            >
              {isDone && !isActive ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className="font-medium">{RETINA_SECTION_LABELS[section]}</span>
          </button>
        );
      })}
    </nav>
  );
}
