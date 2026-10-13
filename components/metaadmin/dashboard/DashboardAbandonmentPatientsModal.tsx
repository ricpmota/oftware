'use client';

import type { AbandonmentPatientRow } from '@/lib/metaadmin/dashboard/abandonmentRanking';

type Props = {
  open: boolean;
  motivo: string;
  patients: AbandonmentPatientRow[];
  onClose: () => void;
  onOpenPaciente?: (pacienteId: string) => void;
};

function formatDate(value: Date | null): string {
  if (!value) return '—';
  return value.toLocaleDateString('pt-BR');
}

export default function DashboardAbandonmentPatientsModal({
  open,
  motivo,
  patients,
  onClose,
  onOpenPaciente,
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Fechar" onClick={onClose} />
      <div
        className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        role="dialog"
        aria-labelledby="abandonment-patients-title"
      >
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border-default)' }}>
          <h3 id="abandonment-patients-title" className="pr-6 text-[16px] font-semibold text-[var(--text-primary)]">
            Pacientes — {motivo}
          </h3>
          <button type="button" onClick={onClose} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Fechar
          </button>
        </div>
        <div className="max-h-[70vh] space-y-2 overflow-y-auto p-4">
          {patients
            .filter((patient) => patient.canIdentify && patient.id)
            .map((patient) => (
              <article
                key={patient.id}
                className="rounded-[14px] border px-4 py-3"
                style={{ borderColor: 'var(--border-default)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-semibold text-[var(--text-primary)]">{patient.nome}</p>
                    <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                      Abandono · {formatDate(patient.dataAbandono)}
                    </p>
                    <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{patient.motivo}</p>
                  </div>
                  {onOpenPaciente ? (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenPaciente(patient.id);
                        onClose();
                      }}
                      className="text-[12px] font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      Ver paciente
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
        </div>
      </div>
    </div>
  );
}
