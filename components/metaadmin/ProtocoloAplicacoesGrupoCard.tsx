'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import { BarraFaixaAplicacoes } from '@/components/metaadmin/BarraFaixaAplicacoes';
import {
  progressoAplicacoesDoProtocolo,
  type ProtocoloTirzepatidaResumo,
} from '@/utils/tirzepatidaProtocoloDisplay';

type Props = {
  proto: ProtocoloTirzepatidaResumo;
  paciente?: PacienteCompleto | null;
  children: ReactNode;
  className?: string;
};

export function ProtocoloAplicacoesGrupoCard({
  proto,
  paciente,
  children,
  className = '',
}: Props) {
  const [expanded, setExpanded] = useState(proto.ativo);
  const progresso = paciente ? progressoAplicacoesDoProtocolo(paciente, proto) : null;

  return (
    <div
      className={`rounded-xl border border-slate-200/90 bg-white dark:border-slate-700 dark:bg-slate-900/40 ${
        expanded ? 'p-2.5 sm:p-3 space-y-2.5' : 'px-3 py-2.5'
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={expanded}
        aria-label={
          expanded ? `Recolher protocolo ${proto.indice}` : `Expandir protocolo ${proto.indice}`
        }
      >
        <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Protocolo {proto.indice}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${
              proto.ativo
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300'
            }`}
          >
            {proto.ativo ? 'Atual' : 'Concluído'}
          </span>
          {progresso && progresso.total > 0 ? (
            <span className="text-[10px] font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">
              {progresso.posicao}/{progresso.total}
            </span>
          ) : null}
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-500 transition-transform dark:text-slate-400 ${
            expanded ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      {expanded && progresso && progresso.total > 0 ? (
        <div
          className="flex items-center gap-2"
          title={`${progresso.posicao} de ${progresso.total} aplicações`}
        >
          <BarraFaixaAplicacoes
            segmentos={progresso.segmentos}
            className="h-1.5 min-w-0 flex-1"
            trackClassName="bg-emerald-100 dark:bg-emerald-950/60"
          />
        </div>
      ) : null}

      {expanded ? <div className="space-y-2.5">{children}</div> : null}
    </div>
  );
}
