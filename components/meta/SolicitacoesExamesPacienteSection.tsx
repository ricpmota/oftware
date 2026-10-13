'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { Download, FileText, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { openSolicitacaoExamesPdfUrl } from '@/utils/solicitacaoExamesPdfGenerate';
import {
  mapSolicitacaoExamesFromFirestore,
  type SolicitacaoExamesSalva,
} from '@/utils/solicitacaoExamesPdfDownload';

function formatarDataHora(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resumoExames(exames: string[]): string {
  if (!exames.length) return 'Nenhum exame';
  if (exames.length <= 3) return exames.join(', ');
  return `${exames.slice(0, 3).join(', ')} +${exames.length - 3}`;
}

export default function SolicitacoesExamesPacienteSection({ pacienteId }: { pacienteId: string }) {
  const [registros, setRegistros] = useState<SolicitacaoExamesSalva[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(
          query(
            collection(db, 'pacientes_completos', pacienteId, 'solicitacoesExames'),
            orderBy('criadoEm', 'desc')
          )
        );
        if (cancel) return;
        setRegistros(
          snap.docs
            .map((d) =>
              mapSolicitacaoExamesFromFirestore(d.id, pacienteId, d.data() as Record<string, unknown>)
            )
            .filter((r) => Boolean(r.signedPdfUrl))
        );
      } catch (err) {
        console.error('[SolicitacoesExamesPacienteSection] Erro ao carregar:', err);
        if (!cancel) setRegistros([]);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [pacienteId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
        Carregando requisições de exames…
      </div>
    );
  }

  if (registros.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-900/40">
      <div className="border-b border-gray-100 bg-emerald-50/60 px-4 py-3 dark:border-gray-700 dark:bg-emerald-950/20">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
          Requisições de exames
        </p>
        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
          PDF assinado pelo médico — use para realizar os exames
        </p>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
        {registros.map((reg) => (
          <li key={reg.id} className="flex items-start gap-3 px-4 py-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {formatarDataHora(reg.criadoEm)}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {reg.exames.length} {reg.exames.length === 1 ? 'exame' : 'exames'} ·{' '}
                {resumoExames(reg.exames)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (reg.signedPdfUrl) openSolicitacaoExamesPdfUrl(reg.signedPdfUrl);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" />
              Baixar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
