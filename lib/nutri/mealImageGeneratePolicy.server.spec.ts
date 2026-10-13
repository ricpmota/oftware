import { describe, expect, it } from 'vitest';
import {
  assertMealImageForceRegenerate,
  assertPatientMayRequestMealImageGeneration,
  parseMealImageForceRegenerate,
  parseMealImageGenerateTrigger,
} from '@/lib/nutri/mealImageGeneratePolicy.server';

describe('assertPatientMayRequestMealImageGeneration', () => {
  it('nutri e médico continuam autorizados no manual', async () => {
    const hasActiveNutritionist = async () => true;
    expect(
      (
        await assertPatientMayRequestMealImageGeneration({
          access: { uid: 'n1', role: 'nutritionist', pacienteDocId: 'p1' },
          trigger: 'manual',
          hasActiveNutritionist,
        })
      ).ok
    ).toBe(true);
    expect(
      (
        await assertPatientMayRequestMealImageGeneration({
          access: { uid: 'd1', role: 'doctor', pacienteDocId: 'p1' },
          trigger: 'automatic',
          hasActiveNutritionist,
        })
      ).ok
    ).toBe(true);
  });

  it('20. POST manual do paciente com nutri → recusa', async () => {
    const result = await assertPatientMayRequestMealImageGeneration({
      access: { uid: 'u1', role: 'patient', pacienteDocId: 'p1' },
      trigger: 'manual',
      hasActiveNutritionist: async () => true,
    });
    expect(result).toMatchObject({
      ok: false,
      status: 403,
      code: 'PATIENT_HAS_LINKED_NUTRITIONIST',
    });
  });

  it('21. POST automatic do paciente com nutri → permitido', async () => {
    const result = await assertPatientMayRequestMealImageGeneration({
      access: { uid: 'u1', role: 'patient', pacienteDocId: 'p1' },
      trigger: 'automatic',
      hasActiveNutritionist: async () => true,
    });
    expect(result).toEqual({ ok: true });
  });

  it('22. POST automatic sem vínculo → recusado', async () => {
    const result = await assertPatientMayRequestMealImageGeneration({
      access: { uid: 'u1', role: 'patient', pacienteDocId: 'p1' },
      trigger: 'automatic',
      hasActiveNutritionist: async () => false,
    });
    expect(result).toMatchObject({
      ok: false,
      status: 403,
      code: 'AUTOMATIC_REQUIRES_LINKED_NUTRITIONIST',
    });
  });

  it('paciente sem nutricionista → manual ok', async () => {
    const result = await assertPatientMayRequestMealImageGeneration({
      access: { uid: 'u1', role: 'patient', pacienteDocId: 'p1' },
      trigger: 'manual',
      hasActiveNutritionist: async () => false,
    });
    expect(result).toEqual({ ok: true });
  });

  it('automatic sem vínculo recusa nutri e médico também', async () => {
    const result = await assertPatientMayRequestMealImageGeneration({
      access: { uid: 'n1', role: 'nutritionist', pacienteDocId: 'p1' },
      trigger: 'automatic',
      hasActiveNutritionist: async () => false,
    });
    expect(result).toMatchObject({
      ok: false,
      status: 403,
      code: 'AUTOMATIC_REQUIRES_LINKED_NUTRITIONIST',
    });
  });

  it('23. trigger inválido', () => {
    expect(parseMealImageGenerateTrigger('foo')).toBe('invalid');
    expect(parseMealImageGenerateTrigger(undefined)).toBe('manual');
    expect(parseMealImageGenerateTrigger('automatic')).toBe('automatic');
  });

  it('7. paciente tenta force → 403', () => {
    const result = assertMealImageForceRegenerate({
      access: { uid: 'u1', role: 'patient', pacienteDocId: 'p1' },
      trigger: 'manual',
    });
    expect(result).toMatchObject({
      ok: false,
      status: 403,
      code: 'FORBIDDEN_MEAL_IMAGE_REGENERATION',
    });
  });

  it('8. automatic + force → recusado', () => {
    expect(
      assertMealImageForceRegenerate({
        access: { uid: 'n1', role: 'nutritionist', pacienteDocId: 'p1' },
        trigger: 'automatic',
      })
    ).toMatchObject({
      ok: false,
      status: 400,
      code: 'INVALID_FORCE_REGENERATE_TRIGGER',
    });
  });

  it('nutri e médico podem force no manual', () => {
    expect(
      assertMealImageForceRegenerate({
        access: { uid: 'n1', role: 'nutritionist', pacienteDocId: 'p1' },
        trigger: 'manual',
      }).ok
    ).toBe(true);
    expect(
      assertMealImageForceRegenerate({
        access: { uid: 'd1', role: 'doctor', pacienteDocId: 'p1' },
        trigger: 'manual',
      }).ok
    ).toBe(true);
  });

  it('forceRegenerate só é true com boolean true', () => {
    expect(parseMealImageForceRegenerate(true)).toBe(true);
    expect(parseMealImageForceRegenerate('true')).toBe(false);
    expect(parseMealImageForceRegenerate(1)).toBe(false);
    expect(parseMealImageForceRegenerate(undefined)).toBe(false);
  });
});
