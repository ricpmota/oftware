import { describe, expect, it } from 'vitest';
import {
  mapCheckInSemanalNutriAuthorship,
  resolveNutritionistIdForCheckIn,
  resolveWeeklyCheckInSaveAuthorship,
} from '@/lib/nutri/checkInSemanalNutriAuthorship';

describe('mapCheckInSemanalNutriAuthorship', () => {
  it('paciente autenticado grava source patient_meta', () => {
    expect(mapCheckInSemanalNutriAuthorship('patient')).toEqual({
      mode: 'patient',
      answeredBy: 'patient',
      source: 'patient_meta',
    });
  });

  it('link público futuro grava source patient_public_link', () => {
    expect(mapCheckInSemanalNutriAuthorship('patient', { publicLink: true })).toEqual({
      mode: 'public',
      answeredBy: 'patient',
      source: 'patient_public_link',
    });
  });

  it('nutricionista não herda autoria do médico', () => {
    expect(mapCheckInSemanalNutriAuthorship('nutritionist')).toEqual({
      mode: 'nutritionist',
      answeredBy: 'nutritionist',
      source: 'nutritionist',
    });
  });
});

describe('resolveNutritionistIdForCheckIn', () => {
  it('quando o nutricionista preenche, usa o id do ator', () => {
    expect(
      resolveNutritionistIdForCheckIn({
        actor: 'nutritionist',
        actorId: 'nutri-1',
        nutricionistaVinculadoIds: ['outro'],
      })
    ).toBe('nutri-1');
  });

  it('quando o paciente preenche, guarda o nutricionista vinculado', () => {
    expect(
      resolveNutritionistIdForCheckIn({
        actor: 'patient',
        actorId: 'paciente-uid',
        nutricionistaVinculadoIds: ['nutri-2'],
      })
    ).toBe('nutri-2');
  });
});

describe('resolveWeeklyCheckInSaveAuthorship', () => {
  it('edição profissional não substitui o autor original', () => {
    const saved = resolveWeeklyCheckInSaveAuthorship({
      existing: { answeredBy: 'patient', answeredById: 'uid-p', source: 'patient_meta' },
      actor: { answeredBy: 'nutritionist', answeredById: 'nutri-1', source: 'nutritionist' },
    });
    expect(saved.answeredBy).toBe('patient');
    expect(saved.lastEditedBy).toBe('nutritionist');
  });
});
