'use client';

import LeadsMedicoCrmView from '@/components/crm/medico/LeadsMedicoCrmView';
import MetaadminLeadsAgendaHub from '@/components/metaadmin/agenda/MetaadminLeadsAgendaHub';
import type { LeadMedico } from '@/types/leadMedico';
import type { Lembrete } from '@/types/lembrete';
import type { LembretesMutation } from '@/lib/metaadmin/lembretesMutation';
import type { PagamentoPaciente } from '@/types/pagamento';
import type { PacienteCompleto } from '@/types/obesidade';

type Props = {
  themeHome: 'light' | 'dark';
  medicoId?: string | null;
  userEmail?: string | null;
  onOpenMessages?: (lead: LeadMedico) => void;
  onOpenManual?: () => void;
  refreshSignal?: number;
  pacientes?: PacienteCompleto[];
  pagamentosPacientes?: Record<string, PagamentoPaciente>;
  lembretes?: Lembrete[];
  onOpenProntuario?: (pacienteId: string) => void;
  onOpenPaciente?: (pacienteId: string) => void;
  onOpenFinanceiro?: (pacienteId: string) => void;
  onMutateLembretes?: (mutation: LembretesMutation) => void;
  organizationPublicName?: string | null;
  variant?: 'home' | 'standalone';
};

export default function MetaadminHomeLeadsPipeline({
  themeHome,
  medicoId,
  userEmail,
  onOpenMessages,
  onOpenManual,
  refreshSignal,
  pacientes,
  pagamentosPacientes,
  lembretes,
  onOpenProntuario,
  onOpenPaciente,
  onOpenFinanceiro,
  onMutateLembretes,
  organizationPublicName,
  variant = 'home',
}: Props) {
  if (!medicoId) return null;

  const pipeline = (
    <LeadsMedicoCrmView
      themeHome={themeHome}
      medicoId={medicoId}
      userEmail={userEmail}
      onOpenMessages={onOpenMessages}
      onOpenManual={onOpenManual}
      refreshSignal={refreshSignal}
      variant={variant}
      pacientes={pacientes}
      pagamentosPacientes={pagamentosPacientes}
      lembretes={lembretes}
      onOpenProntuario={onOpenProntuario}
      onOpenPaciente={onOpenPaciente}
      onOpenFinanceiro={onOpenFinanceiro}
      onMutateLembretes={onMutateLembretes}
      organizationPublicName={organizationPublicName}
    />
  );

  if (variant !== 'standalone') return pipeline;

  return <MetaadminLeadsAgendaHub leadsContent={pipeline} />;
}
