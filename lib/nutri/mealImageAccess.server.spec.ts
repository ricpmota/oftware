import { NextRequest, NextResponse } from 'next/server';
import { describe, expect, it } from 'vitest';
import { requireMealImageAccess, resolveMealImageAccess, type MealImageAccessDb } from '@/lib/nutri/mealImageAccess.server';

function dbStub(overrides: Partial<MealImageAccessDb> = {}): MealImageAccessDb {
  return {
    async getPaciente(pacienteId) {
      if (pacienteId === 'missing') return null;
      return { id: 'pac-1', userId: 'user-pac', nutricionistaVinculadoIds: ['nutri-1'] };
    },
    async isDoctorOfPatient(uid) {
      return uid === 'doc-1';
    },
    async isNutritionistOfPatient(uid) {
      return uid === 'nutri-1';
    },
    ...overrides,
  };
}

describe('resolveMealImageAccess', () => {
  it('autoriza o próprio paciente, nutricionista vinculada e médico', async () => {
    const db = dbStub();
    expect((await resolveMealImageAccess({ uid: 'user-pac', patientId: 'pac-1', db })).ok).toBe(true);
    expect((await resolveMealImageAccess({ uid: 'nutri-1', patientId: 'pac-1', db })).ok).toBe(true);
    expect((await resolveMealImageAccess({ uid: 'doc-1', patientId: 'pac-1', db })).ok).toBe(true);
  });

  it('nega usuário sem vínculo (403) e paciente inexistente (404)', async () => {
    const db = dbStub();
    const forbidden = await resolveMealImageAccess({ uid: 'intruso', patientId: 'pac-1', db });
    expect(forbidden).toEqual({
      ok: false,
      status: 403,
      error: 'Você não tem permissão para este paciente.',
    });

    const missing = await resolveMealImageAccess({ uid: 'user-pac', patientId: 'missing', db });
    expect(missing).toEqual({ ok: false, status: 404, error: 'Paciente não encontrado.' });
  });

  it('não confia em role enviada — só o uid autenticado', async () => {
    const db = dbStub();
    const result = await resolveMealImageAccess({ uid: 'intruso', patientId: 'pac-1', db });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it('401 quando não há Bearer token', async () => {
    const req = new NextRequest('http://localhost/api/nutri/meal-image/generate', { method: 'POST' });
    const result = await requireMealImageAccess(req, 'pac-1');
    expect(result).toBeInstanceOf(NextResponse);
    if (result instanceof NextResponse) {
      expect(result.status).toBe(401);
    }
  });
});
