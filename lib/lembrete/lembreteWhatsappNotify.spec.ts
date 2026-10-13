import { describe, expect, it } from 'vitest';
import { computeLembreteNotificarEm } from '@/lib/lembrete/lembreteWhatsappNotify';

describe('computeLembreteNotificarEm', () => {
  it('agenda no horário e antecipações', () => {
    const noHorario = computeLembreteNotificarEm('2026-07-14', '10:00', 'no_horario');
    const trinta = computeLembreteNotificarEm('2026-07-14', '10:00', '30_min_antes');
    const umaHora = computeLembreteNotificarEm('2026-07-14', '10:00', '1_hora_antes');

    expect(noHorario?.toISOString()).toBe('2026-07-14T13:00:00.000Z');
    expect(trinta?.toISOString()).toBe('2026-07-14T12:30:00.000Z');
    expect(umaHora?.toISOString()).toBe('2026-07-14T12:00:00.000Z');
  });

  it('não agenda quando desabilitado ou sem horário', () => {
    expect(computeLembreteNotificarEm('2026-07-14', '10:00', 'disabled')).toBeNull();
    expect(computeLembreteNotificarEm('2026-07-14', undefined, 'no_horario')).toBeNull();
  });
});
