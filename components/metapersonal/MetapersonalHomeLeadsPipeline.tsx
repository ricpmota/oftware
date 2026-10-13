'use client';

import LeadsProfissionalCrmView, {
  type PacienteCompartilhadoCrmItem,
} from '@/components/crm/profissional/LeadsProfissionalCrmView';
import type { Lembrete } from '@/types/lembrete';

type Props = {
  personalTrainerId?: string | null;
  userEmail?: string | null;
  compartilhados: PacienteCompartilhadoCrmItem[];
  refreshSignal?: number;
  lembretes?: Lembrete[];
  onOpenAbaPersonal?: (pacienteId: string) => void;
  onCreateReminder?: (pacienteId: string, pacienteNome: string) => void;
};

export default function MetapersonalHomeLeadsPipeline({
  personalTrainerId,
  userEmail,
  compartilhados,
  refreshSignal,
  lembretes,
  onOpenAbaPersonal,
  onCreateReminder,
}: Props) {
  if (!personalTrainerId) return null;

  return (
    <LeadsProfissionalCrmView
      role="personal"
      profissionalId={personalTrainerId}
      userEmail={userEmail}
      compartilhados={compartilhados}
      refreshSignal={refreshSignal}
      themeVariant="metaadmin-light"
      lembretes={lembretes}
      onOpenAbaProfissional={onOpenAbaPersonal}
      onCreateReminder={onCreateReminder}
    />
  );
}
