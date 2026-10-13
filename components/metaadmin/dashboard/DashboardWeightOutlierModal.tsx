'use client';

import type { WeightReviewRecord } from '@/lib/metaadmin/dashboard/weightEvolutionAnalysis';

type Props = {
  open: boolean;
  records: WeightReviewRecord[];
  onClose: () => void;
  onOpenPaciente?: (pacienteId: string) => void;
};

function formatKg(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
}

function formatDate(value: Date | null): string {
  if (!value) return '—';
  return value.toLocaleDateString('pt-BR');
}

export default function DashboardWeightOutlierModal({ open, records, onClose, onOpenPaciente }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Fechar" onClick={onClose} />
      <div
        className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        role="dialog"
        aria-labelledby="weight-review-title"
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border-default)' }}>
          <h3 id="weight-review-title" className="text-[16px] font-semibold text-[var(--text-primary)]">
            Registros para revisão
          </h3>
          <button type="button" onClick={onClose} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Fechar
          </button>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
          {records.map((record) => (
            <article
              key={record.id}
              className="rounded-[16px] border p-4"
              style={{ borderColor: 'var(--border-default)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                    {record.canIdentify ? record.pacienteNome : 'Registro agregado'}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                    Semana {record.semana} · {formatDate(record.dataRegistro)}
                  </p>
                </div>
                {record.canIdentify && onOpenPaciente && record.pacienteId ? (
                  <button
                    type="button"
                    onClick={() => onOpenPaciente(record.pacienteId)}
                    className="text-[12px] font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    Ver paciente
                  </button>
                ) : null}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                <div>
                  <dt className="text-[var(--text-secondary)]">Peso anterior</dt>
                  <dd className="font-semibold text-[var(--text-primary)]">{formatKg(record.pesoAnterior)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-secondary)]">Peso informado</dt>
                  <dd className="font-semibold text-[var(--text-primary)]">{formatKg(record.pesoInformado)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--text-secondary)]">Variação</dt>
                  <dd className="font-semibold text-[var(--text-primary)]">
                    {record.variacao == null
                      ? '—'
                      : `${record.variacao > 0 ? '+' : ''}${record.variacao.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--text-secondary)]">Intervalo</dt>
                  <dd className="font-semibold text-[var(--text-primary)]">
                    {record.intervaloDias == null
                      ? '—'
                      : `${record.intervaloDias} dia${record.intervaloDias === 1 ? '' : 's'}`}
                  </dd>
                </div>
              </dl>
              <ul className="mt-3 space-y-1">
                {record.motivos.map((motivo) => (
                  <li key={motivo} className="text-[12px] text-amber-800">
                    {motivo}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
