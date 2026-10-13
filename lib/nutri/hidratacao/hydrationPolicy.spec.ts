import { describe, expect, it } from 'vitest';
import { isPortalHydrationDateAllowed } from '@/lib/nutri/hidratacao/hydrationMath';
import {
  hydrationClientUpdateKeysAllowed,
  hydrationImmutableChanged,
  isHydrationClientSource,
  isHydrationConsumedMlAllowed,
  isHydrationGoalMlAllowed,
} from '@/lib/nutri/hidratacao/hydrationPolicy';

describe('hydrationPolicy', () => {
  it('só permite chaves de consumo no update do cliente', () => {
    expect(
      hydrationClientUpdateKeysAllowed(['consumedMl', 'percentage', 'goalReached', 'lastSource', 'updatedAt'])
    ).toBe(true);
    expect(hydrationClientUpdateKeysAllowed(['consumedMl', 'goalMl'])).toBe(false);
    expect(hydrationClientUpdateKeysAllowed(['patientId'])).toBe(false);
    expect(hydrationClientUpdateKeysAllowed(['userId'])).toBe(false);
    expect(hydrationClientUpdateKeysAllowed(['date'])).toBe(false);
    expect(hydrationClientUpdateKeysAllowed(['createdAt'])).toBe(false);
    expect(hydrationClientUpdateKeysAllowed(['source'])).toBe(false);
  });

  it('detecta tentativa de alterar identidade ou meta do dia', () => {
    expect(hydrationImmutableChanged(['consumedMl'])).toBe(false);
    expect(hydrationImmutableChanged(['goalMl'])).toBe(true);
    expect(hydrationImmutableChanged(['patientId', 'consumedMl'])).toBe(true);
  });

  it('cliente só grava source patient_portal', () => {
    expect(isHydrationClientSource('patient_portal')).toBe(true);
    expect(isHydrationClientSource('whatsapp_checkin')).toBe(false);
    expect(isHydrationClientSource('professional')).toBe(false);
  });

  it('rejeita meta/consumo inválidos', () => {
    expect(isHydrationGoalMlAllowed(2500)).toBe(true);
    expect(isHydrationGoalMlAllowed(0)).toBe(false);
    expect(isHydrationConsumedMlAllowed(0)).toBe(true);
    expect(isHydrationConsumedMlAllowed(20000)).toBe(false);
  });

  it('portal só aceita a janela do dia civil de tratamento', () => {
    const noonSp = new Date('2026-08-31T15:00:00.000Z');
    expect(isPortalHydrationDateAllowed('2026-08-31', noonSp)).toBe(true);
    expect(isPortalHydrationDateAllowed('2026-08-30', noonSp)).toBe(true);
    expect(isPortalHydrationDateAllowed('2026-09-01', noonSp)).toBe(true);
    expect(isPortalHydrationDateAllowed('2026-08-01', noonSp)).toBe(false);
    expect(isPortalHydrationDateAllowed('2026-08-31T00:00:00Z', noonSp)).toBe(false);
  });
});
