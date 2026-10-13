'use client';

import LeadsProfissionalCrmView, {
  type PacienteCompartilhadoCrmItem,
} from '@/components/crm/profissional/LeadsProfissionalCrmView';
import type { Lembrete } from '@/types/lembrete';

type Props = {
  nutricionistaId?: string | null;
  userEmail?: string | null;
  compartilhados: PacienteCompartilhadoCrmItem[];
  refreshSignal?: number;
  lembretes?: Lembrete[];
  onOpenAbaNutri?: (pacienteId: string) => void;
  onCreateReminder?: (pacienteId: string, pacienteNome: string) => void;
};

export default function MetanutriHomeLeadsPipeline({
  nutricionistaId,
  userEmail,
  compartilhados,
  refreshSignal,
  lembretes,
  onOpenAbaNutri,
  onCreateReminder,
}: Props) {
  if (!nutricionistaId) return null;

  return (
    <LeadsProfissionalCrmView
      role="nutri"
      profissionalId={nutricionistaId}
      userEmail={userEmail}
      compartilhados={compartilhados}
      refreshSignal={refreshSignal}
      themeVariant="metaadmin-light"
      lembretes={lembretes}
      onOpenAbaProfissional={onOpenAbaNutri}
      onCreateReminder={onCreateReminder}
    />
  );
}
