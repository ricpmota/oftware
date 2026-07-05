'use client';

import { STATUS_NEGOCIACAO_LABELS } from '@/lib/treatment-negotiation/types';
import type { VersaoPlanoPersonalizado } from '@/lib/treatment-negotiation/types';

type Props = {
  versoes: VersaoPlanoPersonalizado[];
  versaoAtual: number;
};

export default function NegociacaoAuditoriaPanel({ versoes, versaoAtual }: Props) {
  if (versoes.length === 0) return null;

  const recentes = [...versoes].reverse().slice(0, 8);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-1">Auditoria local</h3>
      <p className="text-xs text-slate-500 mb-4">
        Cada alteração gera uma nova versão (v1, v2, v3…). Histórico em memória nesta etapa.
      </p>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {recentes.map((v) => (
          <div
            key={v.versao}
            className={`rounded-lg border px-3 py-2.5 text-xs ${
              v.versao === versaoAtual
                ? 'border-amber-300 bg-amber-50/80'
                : 'border-slate-100 bg-slate-50/50'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-800">
                v{v.versao}
                {v.versao === versaoAtual ? ' · atual' : ''}
              </span>
              <span className="text-slate-500">
                {new Date(v.criadaEm).toLocaleString('pt-BR')} · {v.autor}
              </span>
            </div>
            <p className="text-slate-600 mt-1">
              Status: <strong>{STATUS_NEGOCIACAO_LABELS[v.status]}</strong>
            </p>
            {v.camposAlterados.length > 0 ? (
              <ul className="mt-2 space-y-0.5 text-slate-600">
                {v.camposAlterados.slice(0, 6).map((c) => (
                  <li key={`${v.versao}-${c.campo}`}>
                    <span className="font-medium text-slate-700">{c.campo}:</span>{' '}
                    {c.valorAnterior} → {c.valorNovo}
                  </li>
                ))}
                {v.camposAlterados.length > 6 && (
                  <li className="text-slate-400">
                    +{v.camposAlterados.length - 6} campos
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-slate-400 mt-1">Sem diff registrado</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
