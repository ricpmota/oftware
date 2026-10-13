'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { resolvePacienteDaSolicitacao } from '@/lib/metaadmin/resolvePacienteSolicitacao';
import {
  getMetaChatAnamneseProgress,
  type MetaChatAnamneseProgress,
} from '@/lib/meta/metaChatInicial/wizardProgress';
import type { PacienteCompleto } from '@/types/obesidade';

type Props = {
  pacienteId?: string;
  pacienteEmail?: string;
};

export default function SolicitacaoAnamneseProgressBar({ pacienteId, pacienteEmail }: Props) {
  const [progress, setProgress] = useState<MetaChatAnamneseProgress | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const id = pacienteId?.trim();
    const email = pacienteEmail?.trim();
    if (!id && !email) return;

    let cancelled = false;
    let unsub: (() => void) | undefined;

    const listen = (docId: string) => {
      unsub = onSnapshot(
        doc(db, 'pacientes_completos', docId),
        (snap) => {
          if (cancelled || !snap.exists()) return;
          setProgress(getMetaChatAnamneseProgress({ id: snap.id, ...snap.data() } as PacienteCompleto));
        },
        () => {
          if (!cancelled) setUnavailable(true);
        }
      );
    };

    void resolvePacienteDaSolicitacao({
      pacienteId: id,
      pacienteEmail: email || '',
    })
      .then((paciente) => {
        if (cancelled) return;
        if (!paciente?.id) {
          setUnavailable(true);
          return;
        }
        setProgress(getMetaChatAnamneseProgress(paciente));
        listen(paciente.id);
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [pacienteId, pacienteEmail]);

  if (unavailable) return null;

  if (!progress) {
    return (
      <div className="-mx-3 -mt-3 mb-3 px-3 pt-2.5 pb-2 border-b border-gray-200/80 bg-white/60">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Anamnese</span>
          <span className="h-3 w-12 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full w-1/5 rounded-full bg-gray-300 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-3 -mt-3 mb-3 px-3 pt-2.5 pb-2 border-b border-gray-200/80 bg-white/70">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Anamnese</span>
        <span
          className={`text-[11px] font-semibold tabular-nums ${
            progress.complete ? 'text-emerald-700' : 'text-gray-800'
          }`}
        >
          {progress.current} de {progress.total}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full bg-gray-200 overflow-hidden"
        role="progressbar"
        aria-label="Andamento da anamnese"
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.current}
        aria-valuetext={`${progress.current} de ${progress.total}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            progress.complete ? 'bg-emerald-600' : 'bg-emerald-500'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
        />
      </div>
    </div>
  );
}
