'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import AvaliacaoAtividadeFisicaQuestionnaire, {
  type AvaliacaoAtividadeFisicaPersistence,
} from '@/components/avaliacaoAtividadeFisica/AvaliacaoAtividadeFisicaQuestionnaire';
import PersonalConsultaScheduler from '@/components/personal/consulta/PersonalConsultaScheduler';
import { CheckInSemanalNutriProgress } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriProgress';
import PublicPageBrandFooter from '@/components/public/PublicPageBrandFooter';
import { isValidPublicLinkToken, normalizePublicLinkToken } from '@/lib/publicLinks/publicLinkToken';
import type { AvaliacaoTreinoPublicSnapshot } from '@/lib/personal/agenda/avaliacaoTreinoPublicService';
import type { AvaliacaoAtividadeFisica } from '@/types/avaliacaoAtividadeFisica';
import type { PersonalAvailabilityApiRow } from '@/types/personalAgenda';

type Dados = {
  valid: true;
  patientName: string;
  personalName: string;
  needsAnamnese: boolean;
  avaliacao: AvaliacaoTreinoPublicSnapshot | null;
};

type Phase = 'anamnese' | 'agenda' | 'done';

function snapshotToAssessment(
  pacienteKey: string,
  snapshot: AvaliacaoTreinoPublicSnapshot | null
): AvaliacaoAtividadeFisica | null {
  if (!snapshot) return null;
  const now = new Date().toISOString();
  return {
    id: pacienteKey,
    patientId: pacienteKey,
    status: snapshot.status,
    version: 1,
    currentStep: snapshot.currentStep,
    progressPercent: snapshot.progressPercent,
    answers: snapshot.answers || {},
    safety: { requiresProfessionalAttention: false, reasons: [] },
    startedAt: now,
    updatedAt: now,
    createdBy: 'patient',
    lastUpdatedBy: 'patient',
  };
}

export default function PersonalConsultaPublicPage() {
  const params = useParams<{ token: string }>();
  const token = useMemo(
    () => normalizePublicLinkToken(String(params?.token || '')),
    [params?.token]
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dados, setDados] = useState<Dados | null>(null);
  const [phase, setPhase] = useState<Phase>('agenda');
  const [savingAgenda, setSavingAgenda] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<PersonalAvailabilityApiRow | null>(null);
  const [meeting, setMeeting] = useState<{ date: string; startTime: string; endTime: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isValidPublicLinkToken(token)) {
        setError('Este link não é válido.');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/consulta-personal/${encodeURIComponent(token)}/dados`, {
          cache: 'no-store',
        });
        const json = (await res.json().catch(() => null)) as (Dados & { error?: string }) | null;
        if (cancelled) return;
        if (!res.ok || !json || json.valid !== true) {
          setError(json?.error || 'Este link não é válido.');
          setLoading(false);
          return;
        }
        setDados(json);
        setPhase(json.needsAnamnese ? 'anamnese' : 'agenda');
      } catch {
        if (!cancelled) setError('Este link não é válido.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  /** O id do paciente nunca vai ao navegador; o servidor resolve pelo token. */
  const persistence = useMemo<AvaliacaoAtividadeFisicaPersistence>(() => {
    const url = `/api/consulta-personal/${encodeURIComponent(token)}/anamnese`;
    const post = async (body: Record<string, unknown>) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error || 'Não foi possível salvar. Tente novamente.');
    };
    return {
      async getByPatientId(patientKey) {
        const res = await fetch(url, { cache: 'no-store' });
        const json = (await res.json().catch(() => null)) as {
          avaliacao?: AvaliacaoTreinoPublicSnapshot | null;
          error?: string;
        } | null;
        if (!res.ok) throw new Error(json?.error || 'Não foi possível carregar a anamnese.');
        return snapshotToAssessment(patientKey, json?.avaliacao ?? null);
      },
      async createDraft() {
        await post({ action: 'start' });
      },
      async saveStep({ stepId, partialAnswers, progressPercent, nextStepId, safety }) {
        await post({ action: 'step', stepId, partialAnswers, progressPercent, nextStepId, safety });
      },
      async completeAssessment({ answers }) {
        await post({ action: 'complete', answers });
      },
    };
  }, [token]);

  const submitAgenda = useCallback(async () => {
    if (!selectedSlot) {
      setError('Selecione um horário.');
      return;
    }
    setSavingAgenda(true);
    setError('');
    try {
      const res = await fetch(`/api/consulta-personal/${encodeURIComponent(token)}/agendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availabilityId: selectedSlot.id }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        code?: string;
        meeting?: { date: string; startTime: string; endTime: string };
      } | null;
      if (!res.ok) {
        if (json?.code === 'NEEDS_ANAMNESE') setPhase('anamnese');
        throw new Error(json?.error || 'Erro ao agendar.');
      }
      setMeeting(json?.meeting || selectedSlot);
      setPhase('done');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingAgenda(false);
    }
  }, [selectedSlot, token]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <p className="text-red-600 mb-4">{error || 'Este link não é válido.'}</p>
          <p className="text-sm text-slate-500">
            Verifique se o link está correto ou fale com seu personal.
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'anamnese') {
    return (
      <div className="min-h-dvh bg-slate-50">
        <AvaliacaoAtividadeFisicaQuestionnaire
          patientId={token}
          userId={token}
          patientFullName={dados.patientName}
          initialAssessment={snapshotToAssessment(token, dados.avaliacao)}
          persistence={persistence}
          completeButtonLabel="Escolher horário da consulta"
          onAssessmentComplete={() => {
            setError('');
            setPhase('agenda');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-50 flex flex-col">
      <CheckInSemanalNutriProgress
        progress={phase === 'done' ? 100 : 85}
        stepLabel={phase === 'done' ? 'Pronto' : 'Horário'}
        groupLabel="Consulta com o personal"
      />

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6">
        {error ? (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3" role="alert">
            {error}
          </p>
        ) : null}

        {phase === 'agenda' ? (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-2">
              Agende sua consulta
            </h1>
            <p className="text-sm text-slate-600 mb-5">
              {dados.personalName
                ? `Toque no dia disponível no calendário e escolha um horário com ${dados.personalName}.`
                : 'Toque no dia disponível no calendário e escolha um horário.'}
            </p>
            <PersonalConsultaScheduler
              token={token}
              selectedId={selectedSlot?.id || null}
              onSelect={setSelectedSlot}
            />
            <div className="sticky bottom-0 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] mt-auto bg-gradient-to-t from-white via-white to-transparent">
              <button
                type="button"
                onClick={() => void submitAgenda()}
                disabled={savingAgenda || !selectedSlot}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                {savingAgenda ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Confirmar horário
              </button>
            </div>
          </>
        ) : null}

        {phase === 'done' && meeting ? (
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full border border-slate-100 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Consulta agendada</h2>
            <p className="text-sm text-slate-600">
              {new Date(`${meeting.date}T12:00:00`).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
              })}{' '}
              · {meeting.startTime} – {meeting.endTime}
            </p>
            <p className="text-xs text-slate-500">
              Seu personal já vê este horário no calendário e suas respostas da anamnese.
            </p>
          </div>
        ) : null}
      </div>

      <PublicPageBrandFooter theme={null} className="px-4 pb-6" />
    </div>
  );
}
