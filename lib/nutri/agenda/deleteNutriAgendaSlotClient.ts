import { nutriAgendaAuthFetch } from '@/lib/nutri/agenda/nutriAgendaAuthFetch';
import type { NutriAvailabilityApiRow } from '@/types/nutriAgenda';

export async function deleteNutriAgendaSlot(slot: NutriAvailabilityApiRow): Promise<void> {
  if (slot.status === 'reserved') {
    const res = await nutriAgendaAuthFetch('/api/metanutri/agenda/meetings/update', {
      method: 'POST',
      body: JSON.stringify({ id: slot.id, delete: true }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error || 'Falha ao apagar a consulta.');
    return;
  }

  const res = await nutriAgendaAuthFetch('/api/metanutri/agenda/availability/update', {
    method: 'POST',
    body: JSON.stringify({ id: slot.id, delete: true }),
  });
  const data = (await res.json()) as { error?: string };
  if (res.ok) return;

  const blockRes = await nutriAgendaAuthFetch('/api/metanutri/agenda/availability/update', {
    method: 'POST',
    body: JSON.stringify({ id: slot.id, status: 'blocked' }),
  });
  const blockData = (await blockRes.json()) as { error?: string };
  if (!blockRes.ok) {
    throw new Error(data.error || blockData.error || 'Falha ao remover o horário.');
  }
}
