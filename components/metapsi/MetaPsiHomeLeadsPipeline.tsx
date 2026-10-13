'use client';

import LeadsProfissionalCrmView, {
  type PacienteCompartilhadoCrmItem,
} from '@/components/crm/profissional/LeadsProfissionalCrmView';
import type { Lembrete } from '@/types/lembrete';

type Props = {
  psiquiatraId?: string | null;
  userEmail?: string | null;
  compartilhados: PacienteCompartilhadoCrmItem[];
  refreshSignal?: number;
  lembretes?: Lembrete[];
  onOpenAbaPsi?: (pacienteId: string) => void;
  onCreateReminder?: (pacienteId: string, pacienteNome: string) => void;
};

/** Pipeline CRM Leads do MetaPsi — mesma view Nutri/Personal, role `psiquiatra`. */
export default function MetaPsiHomeLeadsPipeline({
  psiquiatraId,
  userEmail,
  compartilhados,
  refreshSignal,
  lembretes,
  onOpenAbaPsi,
  onCreateReminder,
}: Props) {
  if (!psiquiatraId) return null;

  return (
    <LeadsProfissionalCrmView
      role="psiquiatra"
      profissionalId={psiquiatraId}
      userEmail={userEmail}
      compartilhados={compartilhados}
      refreshSignal={refreshSignal}
      themeVariant="metaadmin-light"
      lembretes={lembretes}
      onOpenAbaProfissional={onOpenAbaPsi}
      onCreateReminder={onCreateReminder}
    />
  );
}
