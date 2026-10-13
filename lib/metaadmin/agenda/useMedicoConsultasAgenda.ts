'use client';

import { useCallback, useEffect, useState } from 'react';
import { medicoAgendaAuthFetch } from '@/lib/metaadmin/agenda/medicoAgendaAuthFetch';
import type { ConsultaCalendarioItem } from '@/components/profissional/ProfissionalCalendarioSection';

export function useMedicoConsultasAgenda(enabled: boolean) {
  const [consultas, setConsultas] = useState<ConsultaCalendarioItem[]>([]);

  const reload = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await medicoAgendaAuthFetch('/api/metaadmin/agenda/meetings');
      const data = (await res.json()) as {
        meetings?: Array<{
          id: string;
          date: string;
          startTime: string;
          endTime: string;
          pacienteNome?: string;
          pacienteId?: string;
          observacoes?: string;
          realizada?: boolean;
        }>;
        error?: string;
      };
      if (!res.ok) return;
      setConsultas(
        (data.meetings || []).map((m) => ({
          id: m.id,
          date: m.date,
          startTime: m.startTime,
          endTime: m.endTime,
          pacienteNome: m.pacienteNome || 'Paciente',
          pacienteId: m.pacienteId,
          observacoes: m.observacoes,
          realizada: m.realizada === true,
        }))
      );
    } catch (error) {
      console.error('[Metaadmin] Erro ao carregar consultas agendadas:', error);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [enabled, reload]);

  return { consultas, reload };
}
