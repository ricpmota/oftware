import { describe, expect, it } from 'vitest';
import {
  isTrainingSessionActive,
  shouldCountSessionInStats,
  shouldShowSessionOnCalendar,
} from '@/lib/personal/trainingSessionActive';

describe('trainingSessionActive', () => {
  it('considera ativo quando o campo não existe (legado)', () => {
    expect(isTrainingSessionActive({})).toBe(true);
    expect(isTrainingSessionActive({ active: true })).toBe(true);
    expect(isTrainingSessionActive({ active: undefined })).toBe(true);
  });

  it('considera inativo só com active === false', () => {
    expect(isTrainingSessionActive({ active: false })).toBe(false);
    expect(shouldShowSessionOnCalendar({ active: false })).toBe(false);
    expect(shouldShowSessionOnCalendar({ active: true })).toBe(true);
  });

  it('não conta treino desativado ainda agendado nas estatísticas', () => {
    expect(shouldCountSessionInStats({ active: false }, 'scheduled')).toBe(false);
    expect(shouldCountSessionInStats({ active: false }, 'done')).toBe(true);
    expect(shouldCountSessionInStats({ active: false }, 'skipped')).toBe(true);
    expect(shouldCountSessionInStats({ active: true }, 'scheduled')).toBe(true);
  });
});
