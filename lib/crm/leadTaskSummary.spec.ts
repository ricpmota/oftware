import { describe, expect, it } from 'vitest';
import { formatLeadTaskCounter, summarizeLeadTasks } from '@/lib/crm/leadTaskSummary';
import type { Lembrete } from '@/types/lembrete';

const NOW = new Date(2026, 5, 21, 12, 0, 0);

describe('leadTaskSummary', () => {
  it('conta pendentes e atrasados', () => {
    const lembretes: Lembrete[] = [
      {
        id: '1',
        pacienteId: 'p1',
        pacienteNome: 'A',
        data: '2026-06-10',
        texto: 'Cobrar',
        tag: 'Cobrança',
        criadoEm: NOW,
      },
      {
        id: '2',
        pacienteId: 'p1',
        pacienteNome: 'A',
        data: '2026-06-25',
        texto: 'Retorno',
        tag: 'Consulta',
        criadoEm: NOW,
        concluido: true,
      },
    ];
    const s = summarizeLeadTasks(lembretes, NOW);
    expect(s.total).toBe(2);
    expect(s.completed).toBe(1);
    expect(s.pending).toBe(1);
    expect(s.overdue).toBe(1);
    expect(formatLeadTaskCounter(s)).toBe('1/2');
  });
});
