'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { LaudoGuiadoExamType } from '@/types/oftpay/laudoGuiado';
import { getLaudoGuiadoExamOption } from '@/types/oftpay/laudoGuiado';
import LaudoGuiadoExamNav from '@/components/oftpay/laudos/LaudoGuiadoExamNav';
import LaudoGuiadoUnderConstruction from '@/components/oftpay/laudos/LaudoGuiadoUnderConstruction';
import RetinaGuidedReportBuilder from '@/components/oftpay/laudos/retina/RetinaGuidedReportBuilder';

interface LaudoGuiadoWorkspaceProps {
  courseId: string;
  courseName: string;
}

export default function LaudoGuiadoWorkspace({ courseName }: LaudoGuiadoWorkspaceProps) {
  const [activeExam, setActiveExam] = useState<LaudoGuiadoExamType>('mapeamento_retina');
  const activeOption = getLaudoGuiadoExamOption(activeExam);

  return (
    <div className="fixed inset-0 overflow-y-auto bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link
            href="/oftpay"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            OftPay
          </Link>
          <div className="h-5 w-px shrink-0 bg-gray-200" aria-hidden />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-gray-900 md:text-base">
              {courseName}
            </h1>
            <p className="truncate text-xs text-gray-500">
              Laudo guiado — {activeOption?.label ?? 'Exame'}
            </p>
          </div>
        </div>

        <LaudoGuiadoExamNav activeExam={activeExam} onExamChange={setActiveExam} />
      </header>

      {activeExam === 'mapeamento_retina' ? (
        <RetinaGuidedReportBuilder variant="embedded" />
      ) : activeOption ? (
        <LaudoGuiadoUnderConstruction exam={activeOption} />
      ) : null}
    </div>
  );
}
