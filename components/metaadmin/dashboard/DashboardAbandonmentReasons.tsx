'use client';

import { useMemo, useState } from 'react';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  buildAbandonmentRanking,
  type AbandonmentReasonItem,
} from '@/lib/metaadmin/dashboard/abandonmentRanking';
import DashboardAbandonmentPatientsModal from '@/components/metaadmin/dashboard/DashboardAbandonmentPatientsModal';

type Props = {
  pacientes: PacienteCompleto[];
  ownPatientIds: string[];
  onOpenPaciente?: (pacienteId: string) => void;
};

function formatPct(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 0 });
}

export default function DashboardAbandonmentReasons({ pacientes, ownPatientIds, onOpenPaciente }: Props) {
  const ranking = useMemo(
    () => buildAbandonmentRanking(pacientes, new Set(ownPatientIds)),
    [pacientes, ownPatientIds]
  );
  const [selected, setSelected] = useState<AbandonmentReasonItem | null>(null);
  const maxCount = ranking.items[0]?.count || 1;

  return (
    <div
      className="border bg-[var(--surface-card)]"
      style={{ borderColor: 'var(--border-default)', borderRadius: 20 }}
    >
      <div className="p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Motivos de abandono</h3>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
              Entenda os principais motivos de interrupção do acompanhamento.
            </p>
          </div>
          {ranking.totalAbandonos > 0 ? (
            <div className="shrink-0 text-right">
              <p className="text-[15px] font-bold tabular-nums text-[var(--text-primary)]">
                {ranking.totalAbandonos} abandono{ranking.totalAbandonos === 1 ? '' : 's'}
              </p>
              {ranking.percentCarteira != null ? (
                <p className="text-[12px] text-[var(--text-secondary)]">
                  {formatPct(ranking.percentCarteira)}% da carteira
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {ranking.items.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--text-secondary)]">
            Nenhum abandono registrado no período/base selecionada.
          </p>
        ) : (
          <ol className="space-y-4">
            {ranking.items.map((item, index) => {
              const width = Math.max(8, (item.count / maxCount) * 100);
              const canOpenPatients = item.patients.some((p) => p.canIdentify && p.id);
              const rowClass = canOpenPatients
                ? 'w-full rounded-[14px] px-1 py-1 text-left transition-colors hover:bg-gray-50'
                : 'w-full rounded-[14px] px-1 py-1 text-left';
              const rowInner = (
                <div className="flex items-start gap-3">
                  <span className="w-7 shrink-0 text-[13px] font-bold tabular-nums text-[var(--text-secondary)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-[var(--text-primary)]">{item.motivo}</p>
                    <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                      {item.count} paciente{item.count === 1 ? '' : 's'} · {formatPct(item.percent)}% dos abandonos
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${width}%`,
                          backgroundColor: 'var(--brand-secondary, #0A1F44)',
                          opacity: 0.55 + (item.count / maxCount) * 0.45,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
              return (
                <li key={item.motivo}>
                  {canOpenPatients ? (
                    <button type="button" onClick={() => setSelected(item)} className={rowClass}>
                      {rowInner}
                    </button>
                  ) : (
                    <div className={rowClass}>{rowInner}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <DashboardAbandonmentPatientsModal
        open={!!selected}
        motivo={selected?.motivo || ''}
        patients={selected?.patients || []}
        onClose={() => setSelected(null)}
        onOpenPaciente={onOpenPaciente}
      />
    </div>
  );
}
