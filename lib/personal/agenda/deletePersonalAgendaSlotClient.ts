import { personalAgendaAuthFetch } from '@/lib/personal/agenda/personalAgendaAuthFetch';
import type { PersonalAvailabilityApiRow } from '@/types/personalAgenda';

export async function deletePersonalAgendaSlot(slot: PersonalAvailabilityApiRow): Promise<void> {
  if (slot.status === 'reserved') {
    const res = await personalAgendaAuthFetch('/api/metapersonal/agenda/meetings/update', {
      method: 'POST',
      body: JSON.stringify({ id: slot.id, delete: true }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error || 'Falha ao apagar a consulta.');
    return;
  }

  const res = await personalAgendaAuthFetch('/api/metapersonal/agenda/availability/update', {
    method: 'POST',
    body: JSON.stringify({ id: slot.id, delete: true }),
  });
  const data = (await res.json()) as { error?: string };
  if (res.ok) return;

  const blockRes = await personalAgendaAuthFetch('/api/metapersonal/agenda/availability/update', {
    method: 'POST',
    body: JSON.stringify({ id: slot.id, status: 'blocked' }),
  });
  const blockData = (await blockRes.json()) as { error?: string };
  if (!blockRes.ok) {
    throw new Error(data.error || blockData.error || 'Falha ao remover o horário.');
  }
}
