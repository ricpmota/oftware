'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AvaliacaoAtividadeFisicaQuestionnaire } from '@/components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaQuestionnaire';
import { avaliacaoAtividadeFisicaService } from '@/services/avaliacaoAtividadeFisicaService';
import type { AvaliacaoAtividadeFisica } from '@/types/avaliacaoAtividadeFisica';

/**
 * Feature flag — desliga apenas com `false` / `0`.
 * Ausente ou `true` → avaliação ativa no Personal do paciente.
 */
export function isAvaliacaoAtividadeFisicaEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_PHYSICAL_ACTIVITY_ASSESSMENT_ENABLED;
  if (v === 'false' || v === '0') return false;
  return true;
}

export type AvaliacaoAtividadeFisicaGateProps = {
  /** Modo personal / embed: nunca mostra o questionário. */
  isPersonalTrainerMode: boolean;
  fromMetapersonal?: boolean;
  patientId: string | null | undefined;
  userId: string | null | undefined;
  patientFullName?: string | null;
  children: ReactNode;
};

/**
 * Gate da avaliação de atividade física no fluxo do paciente.
 * - Sem avaliação completed → questionário
 * - Completed → Personal (o treino é montado pelo personal, não automaticamente)
 */
export function AvaliacaoAtividadeFisicaGate({
  isPersonalTrainerMode,
  fromMetapersonal = false,
  patientId,
  userId,
  patientFullName,
  children,
}: AvaliacaoAtividadeFisicaGateProps) {
  const router = useRouter();
  const enabled = isAvaliacaoAtividadeFisicaEnabled();
  const gateActive = enabled && !isPersonalTrainerMode && !fromMetapersonal;
  const identityReady = Boolean(patientId && userId);

  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<AvaliacaoAtividadeFisica | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [forceShowPersonal, setForceShowPersonal] = useState(false);

  const reload = useCallback(async () => {
    if (!gateActive || !patientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      setAssessment(await avaliacaoAtividadeFisicaService.getByPatientId(patientId));
    } catch (e) {
      console.error('[AvaliacaoAtividadeFisicaGate]', e);
      setLoadError(
        e instanceof Error ? e.message : 'Não foi possível carregar sua avaliação de treino.'
      );
    } finally {
      setLoading(false);
    }
  }, [gateActive, patientId]);

  useEffect(() => {
    setForceShowPersonal(false);
    if (!gateActive) {
      setLoading(false);
      return;
    }
    if (!identityReady) {
      setLoading(true);
      setAssessment(null);
      return;
    }
    void reload();
  }, [gateActive, identityReady, reload]);

  if (!gateActive || forceShowPersonal) {
    return <>{children}</>;
  }

  if (!identityReady || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A1F44] via-[#0d2a5a] to-[#0A1F44] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-red-100 bg-white p-6 text-center space-y-3">
          <p className="text-red-700 text-sm">{loadError}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium"
          >
            Tentar novamente
          </button>
          <button
            type="button"
            onClick={() => setForceShowPersonal(true)}
            className="block w-full text-sm text-slate-500 underline"
          >
            Continuar para o Personal mesmo assim
          </button>
        </div>
      </div>
    );
  }

  if (assessment?.status === 'completed') {
    return <>{children}</>;
  }

  return (
    <AvaliacaoAtividadeFisicaQuestionnaire
      key={assessment?.id || patientId || 'avaliacao-nova'}
      patientId={patientId!}
      userId={userId!}
      patientFullName={patientFullName}
      initialAssessment={assessment}
      completeButtonLabel="Continuar"
      onAssessmentComplete={() => {
        void reload();
      }}
      onDefer={() => router.push('/meta')}
    />
  );
}

export default AvaliacaoAtividadeFisicaGate;
