'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardList, Dumbbell, X } from 'lucide-react';
import { AvaliacaoAtividadeFisicaProfessionalView } from '@/components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaProfessionalView';
import { AvaliacaoAtividadeFisicaStatusBadge } from '@/components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaStatusBadge';
import {
  WorkoutPlanDraftPreview,
  isTrainingEnginePreviewEnabled,
} from '@/components/trainingEngine/WorkoutPlanDraftPreview';
import { avaliacaoAtividadeFisicaService } from '@/services/avaliacaoAtividadeFisicaService';
import type { AvaliacaoAtividadeFisicaStatus } from '@/types/avaliacaoAtividadeFisica';

export type ProfessionalPersonalToolsBarProps = {
  patientId: string;
  viewerRole: 'doctor' | 'personal_trainer';
  userId: string | null | undefined;
  patientName?: string | null;
  organizationId?: string | null;
  /** Tema escuro (tela Personal). */
  dark?: boolean;
};

/**
 * Faixa compacta para médico/personal: acesso à anamnese e (se ainda não gravado) ao plano gerado.
 * Não compete com as abas Hoje/Criar/Cronograma.
 */
export function ProfessionalPersonalToolsBar({
  patientId,
  viewerRole,
  userId,
  patientName,
  organizationId = null,
  dark = true,
}: ProfessionalPersonalToolsBarProps) {
  const [assessmentStatus, setAssessmentStatus] = useState<
    AvaliacaoAtividadeFisicaStatus | null | undefined
  >(undefined);
  const [planSaved, setPlanSaved] = useState(false);
  const [anamneseOpen, setAnamneseOpen] = useState(false);
  const [planoOpen, setPlanoOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  const reloadMeta = useCallback(async () => {
    if (!patientId) return;
    try {
      const doc = await avaliacaoAtividadeFisicaService.getByPatientId(patientId);
      setAssessmentStatus(doc?.status ?? null);
      const cal = doc?.patientPlanCalendar;
      setPlanSaved(
        Boolean(
          cal?.savedAt || cal?.clearedAt || doc?.patientPlanDismissedAt
        )
      );
    } catch {
      setAssessmentStatus(null);
      setPlanSaved(false);
    }
  }, [patientId]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    void reloadMeta();
  }, [reloadMeta]);

  useEffect(() => {
    if (!anamneseOpen && !planoOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAnamneseOpen(false);
        setPlanoOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [anamneseOpen, planoOpen]);

  const showPlanoCta =
    isTrainingEnginePreviewEnabled() && assessmentStatus === 'completed' && !planSaved;

  const barClass = dark
    ? 'flex flex-wrap items-center gap-2 px-3 py-2 border-b border-white/10 bg-[#0A1F44]/80'
    : 'flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white';

  const btnClass = dark
    ? 'inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-[#E8EDED]/90 hover:bg-white/10'
    : 'inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100';

  const sheet = (title: string, onClose: () => void, children: ReactNode) => (
    <div className="fixed inset-0 z-[10050] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );

  return (
    <>
      <div className={barClass}>
        <AvaliacaoAtividadeFisicaStatusBadge
          status={assessmentStatus === undefined ? null : assessmentStatus}
          className="shrink-0"
        />
        <button type="button" className={btnClass} onClick={() => setAnamneseOpen(true)}>
          <ClipboardList className="h-3.5 w-3.5" />
          Ver anamnese
        </button>
        {showPlanoCta ? (
          <button type="button" className={btnClass} onClick={() => setPlanoOpen(true)}>
            <Dumbbell className="h-3.5 w-3.5" />
            Plano gerado
          </button>
        ) : null}
        {planSaved ? (
          <span
            className={
              dark
                ? 'text-[11px] text-[#E8EDED]/45'
                : 'text-[11px] text-slate-500'
            }
          >
            Treino automático já liberado — use Criar/Cronograma
          </span>
        ) : null}
      </div>

      {portalReady &&
        anamneseOpen &&
        createPortal(
          sheet('Anamnese de atividade física', () => setAnamneseOpen(false), (
            <AvaliacaoAtividadeFisicaProfessionalView
              key={`anamnese-sheet-${patientId}`}
              patientId={patientId}
              viewerRole={viewerRole}
              patientName={patientName}
              compact
            />
          )),
          document.body
        )}

      {portalReady &&
        planoOpen &&
        !planSaved &&
        createPortal(
          sheet('Plano gerado', () => {
            setPlanoOpen(false);
            void reloadMeta();
          }, (
            <WorkoutPlanDraftPreview
              key={`plano-sheet-${patientId}`}
              patientId={patientId}
              viewerRole={viewerRole}
              userId={userId}
              organizationId={organizationId}
              compact
            />
          )),
          document.body
        )}
    </>
  );
}

export default ProfessionalPersonalToolsBar;
