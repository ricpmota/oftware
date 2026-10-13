'use client';

import { Loader2 } from 'lucide-react';
import DashboardTestimonialCard, {
  DashboardPatientAvatar,
  type DashboardDepoimento,
} from '@/components/metaadmin/dashboard/DashboardTestimonialCard';

export type { DashboardDepoimento };
export { DashboardPatientAvatar };

type Props = {
  depoimentos: DashboardDepoimento[];
  loading: boolean;
  onOpenDepoimento: (depoimento: DashboardDepoimento) => void;
};

export default function DashboardPatientExperience({ depoimentos, loading, onOpenDepoimento }: Props) {
  const comNota = depoimentos.filter((d) => typeof d.estrelas === 'number' && d.estrelas > 0);
  const mediaEstrelas =
    comNota.length > 0 ? comNota.reduce((sum, d) => sum + d.estrelas, 0) / comNota.length : null;

  return (
    <div
      className="border bg-[var(--surface-card)]"
      style={{ borderColor: 'var(--border-default)', borderRadius: 20 }}
    >
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Experiência do paciente</h3>
            <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
              Feedbacks registrados durante o acompanhamento.
            </p>
          </div>
          {!loading && depoimentos.length > 0 ? (
            <div className="flex gap-4">
              {mediaEstrelas != null ? (
                <div className="text-right">
                  <p className="text-[15px] font-bold tabular-nums text-[var(--text-primary)]">
                    {mediaEstrelas.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 5
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">Avaliação média</p>
                </div>
              ) : null}
              <div className="text-right">
                <p className="text-[15px] font-bold tabular-nums text-[var(--text-primary)]">{depoimentos.length}</p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {depoimentos.length === 1 ? 'depoimento recebido' : 'depoimentos recebidos'}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="ml-2 text-sm text-[var(--text-secondary)]">Carregando depoimentos...</span>
          </div>
        ) : depoimentos.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[var(--text-secondary)]">Nenhum depoimento disponível.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:thin]">
            {depoimentos.map((depoimento) => (
              <DashboardTestimonialCard
                key={depoimento.instanceKey ?? depoimento.pacienteId}
                depoimento={depoimento}
                onOpen={() => onOpenDepoimento(depoimento)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
