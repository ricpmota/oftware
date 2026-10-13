'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { CheckInSemanalNutriWizard } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriWizard';
import type { NutriCheckInPublicDados } from '@/lib/nutri/checkInSemanalNutriPublicDados';
import {
  isValidNutriCheckInPublicToken,
  normalizeNutriCheckInPublicToken,
} from '@/lib/nutri/checkInSemanalNutriPublicLink';
import type { CheckInSemanalNutriAnswers } from '@/lib/nutri/checkInSemanalNutriTypes';
import { CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION } from '@/lib/nutri/checkInSemanalNutriTypes';
import { getNutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';

type PageState =
  | { kind: 'loading' }
  | { kind: 'invalid'; message: string }
  | { kind: 'ready'; dados: NutriCheckInPublicDados };

export default function CheckInSemanalNutriPublicPage() {
  const params = useParams<{ token: string }>();
  const token = useMemo(
    () => normalizeNutriCheckInPublicToken(String(params?.token || '')),
    [params?.token]
  );
  const [state, setState] = useState<PageState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isValidNutriCheckInPublicToken(token)) {
        if (!cancelled) setState({ kind: 'invalid', message: 'Este link não é válido.' });
        return;
      }
      try {
        const res = await fetch(`/api/checkin-nutri/${encodeURIComponent(token)}/dados`, {
          cache: 'no-store',
        });
        const json = (await res.json().catch(() => null)) as
          | (NutriCheckInPublicDados & { error?: string })
          | null;
        if (cancelled) return;
        if (!res.ok || !json || json.valid !== true) {
          setState({
            kind: 'invalid',
            message: json?.error || 'Este link não é válido.',
          });
          return;
        }
        setState({ kind: 'ready', dados: json });
      } catch {
        if (!cancelled) setState({ kind: 'invalid', message: 'Este link não é válido.' });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = useCallback(
    async (answers: CheckInSemanalNutriAnswers) => {
      const res = await fetch(`/api/checkin-nutri/${encodeURIComponent(token)}/atualizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        score?: number;
        alreadyCompleted?: boolean;
      } | null;
      if (!res.ok) {
        if (res.status === 409) {
          setState((prev) =>
            prev.kind === 'ready'
              ? {
                  kind: 'ready',
                  dados: {
                    ...prev.dados,
                    alreadyCompleted: true,
                    score: json?.score ?? prev.dados.score,
                  },
                }
              : prev
          );
          return;
        }
        throw new Error(json?.error || 'Não foi possível enviar o check-in.');
      }
      setState((prev) =>
        prev.kind === 'ready'
          ? {
              kind: 'ready',
              dados: {
                ...prev.dados,
                alreadyCompleted: true,
                score: json?.score ?? prev.dados.score,
              },
            }
          : prev
      );
    },
    [token]
  );

  if (state.kind === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" aria-label="Carregando" />
      </div>
    );
  }

  if (state.kind === 'invalid') {
    const revoked = /não está mais disponível/i.test(state.message);
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">
            {revoked ? 'Este link não está mais disponível.' : 'Este link não é válido.'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {revoked ? 'Entre em contato com seu nutricionista.' : state.message}
          </p>
        </div>
      </div>
    );
  }

  const { dados } = state;
  const week = getNutritionWeek(dados.week.weekStart);

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50">
      <CheckInSemanalNutriWizard
        mode="public"
        week={week}
        pacienteNome={dados.patient.firstName}
        nutricionistaNome={dados.nutritionist.displayName}
        metaAguaMl={dados.context.aguaDia_ml}
        menuContext={dados.context.menu ?? null}
        questionnaireVersion={CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION}
        alreadyCompleted={dados.alreadyCompleted}
        initialScore={dados.score}
        canEdit={false}
        onSubmit={onSubmit}
      />
    </div>
  );
}
