'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardList, Loader2, X } from 'lucide-react';
import {
  AvaliacaoAtividadeFisicaQuestionnaire,
  type AvaliacaoAtividadeFisicaPersistence,
} from '@/components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaQuestionnaire';
import { personalAgendaAuthFetch } from '@/lib/personal/agenda/personalAgendaAuthFetch';
import type { PacienteCompleto } from '@/types/obesidade';
import type {
  AvaliacaoAtividadeFisica,
  AvaliacaoAtividadeFisicaBasicAnswers,
} from '@/types/avaliacaoAtividadeFisica';

type Props = {
  open: boolean;
  paciente: PacienteCompleto;
  onClose: () => void;
};

function patientName(paciente: PacienteCompleto): string {
  return paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Paciente';
}

async function readError(response: Response): Promise<never> {
  const json = (await response.json().catch(() => null)) as { error?: string } | null;
  throw new Error(json?.error || 'Não foi possível concluir a operação.');
}

export function MetapersonalPacienteAnamneseModal({ open, paciente, onClose }: Props) {
  const pacienteId = String(paciente.id || '').trim();
  const [portalReady, setPortalReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<AvaliacaoAtividadeFisica | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !pacienteId) return;
    const signal = { cancelled: false };
    setLoading(true);
    setError(null);
    setAssessment(null);
    void (async () => {
      try {
        const response = await personalAgendaAuthFetch(
          `/api/meta/personal/anamnese?pacienteId=${encodeURIComponent(pacienteId)}`
        );
        if (!response.ok) await readError(response);
        const json = (await response.json()) as { avaliacao?: AvaliacaoAtividadeFisica | null };
        if (signal.cancelled) return;
        setAssessment(json.avaliacao || null);
      } catch (cause) {
        if (signal.cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a anamnese.');
      } finally {
        if (!signal.cancelled) setLoading(false);
      }
    })();
    return () => {
      signal.cancelled = true;
    };
  }, [open, pacienteId, reloadKey]);

  const persistence = useMemo<AvaliacaoAtividadeFisicaPersistence>(
    () => ({
      async getByPatientId() {
        const response = await personalAgendaAuthFetch(
          `/api/meta/personal/anamnese?pacienteId=${encodeURIComponent(pacienteId)}`
        );
        if (!response.ok) await readError(response);
        const json = (await response.json()) as { avaliacao?: AvaliacaoAtividadeFisica | null };
        return json.avaliacao || null;
      },
      async createDraft() {
        const response = await personalAgendaAuthFetch('/api/meta/personal/anamnese', {
          method: 'POST',
          body: JSON.stringify({ action: 'start', pacienteId }),
        });
        if (!response.ok) await readError(response);
      },
      async saveStep(params) {
        const response = await personalAgendaAuthFetch('/api/meta/personal/anamnese', {
          method: 'POST',
          body: JSON.stringify({
            action: 'step',
            pacienteId,
            stepId: params.stepId,
            partialAnswers: params.partialAnswers,
            progressPercent: params.progressPercent,
            nextStepId: params.nextStepId,
            safety: params.safety ?? null,
          }),
        });
        if (!response.ok) await readError(response);
      },
      async completeAssessment(params: { patientId: string; answers: AvaliacaoAtividadeFisicaBasicAnswers }) {
        const response = await personalAgendaAuthFetch('/api/meta/personal/anamnese', {
          method: 'POST',
          body: JSON.stringify({
            action: 'complete',
            pacienteId,
            answers: params.answers,
          }),
        });
        if (!response.ok) await readError(response);
      },
    }),
    [pacienteId]
  );

  if (!open || !portalReady) return null;

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Anamnese">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative z-10 flex max-h-[92vh] w-[96vw] max-w-3xl flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-gray-900">Anamnese</h2>
              <p className="truncate text-sm text-gray-500">{patientName(paciente)}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-white px-4 py-5 sm:px-6">
          {!pacienteId ? (
            <p className="text-sm text-gray-500">Não foi possível identificar este paciente.</p>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              Carregando anamnese…
            </div>
          ) : error ? (
            <div className="mx-auto max-w-lg rounded-2xl border border-red-100 bg-white p-6 text-center">
              <p className="text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <AvaliacaoAtividadeFisicaQuestionnaire
              key={`${pacienteId}-${assessment?.updatedAt || 'nova'}-${reloadKey}`}
              patientId={pacienteId}
              userId={String(paciente.userId || pacienteId)}
              patientFullName={patientName(paciente)}
              initialAssessment={assessment}
              audience="professional"
              embedded
              persistence={persistence}
              onAssessmentComplete={() => undefined}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
