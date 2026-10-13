import { describe, expect, it } from 'vitest';
import {
  canEditWeeklyNutritionCheckIn,
  resolveCheckInSemanalNutriInteraction,
} from '@/lib/nutri/canEditWeeklyNutritionCheckIn';
import { CHECK_IN_SEMANAL_QUESTIONS } from '@/lib/aplicacao/checkInSemanalQuestions';
import {
  mergeCheckInSemanalNutriWrite,
  sortCheckInsSemanaisNewestFirst,
  weeklyScoreDelta,
} from '@/lib/nutri/checkInSemanalNutriMerge';
import { CHECKIN_SEMANAL_NUTRI_COLLECTION, checkInSemanalNutriDocSegments } from '@/lib/nutri/checkInSemanalNutriTypes';
import { getNutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';

describe('ETAPA 02 — persistência e identidade', () => {
  it('grava em checkinsSemanais/{weekKey} e não na coleção diária', () => {
    const week = getNutritionWeek('2026-08-19');
    const segments = checkInSemanalNutriDocSegments('pac-1', week.weekKey);
    expect(CHECKIN_SEMANAL_NUTRI_COLLECTION).toBe('checkinsSemanais');
    expect(CHECKIN_SEMANAL_NUTRI_COLLECTION).not.toBe('checkins');
    expect(segments).toEqual([
      'pacientes_completos',
      'pac-1',
      'nutricao',
      'dados',
      'checkinsSemanais',
      '2026-08-17',
    ]);
  });

  it('apagar usa o mesmo documento da semana', () => {
    expect(checkInSemanalNutriDocSegments('pac-1', '2026-08-17').slice(-2)).toEqual([
      'checkinsSemanais',
      '2026-08-17',
    ]);
  });

  it('reabrir a mesma semana reutiliza a mesma weekKey (sem duplicata)', () => {
    expect(getNutritionWeek('2026-08-17').weekKey).toBe('2026-08-17');
    expect(getNutritionWeek('2026-08-23').weekKey).toBe('2026-08-17');
    expect(getNutritionWeek('2026-08-24').weekKey).toBe('2026-08-24');
  });

  it('edição preserva createdAt, scheduledDate e nutritionistId', () => {
    const createdAt = { seconds: 1, nanoseconds: 0 };
    const serialized = {
      weekKey: '2026-08-17',
      score: 90,
      updatedAt: { seconds: 2, nanoseconds: 0 },
      createdAt: { seconds: 9, nanoseconds: 0 },
      scheduledDate: null,
      nutritionistId: '',
    };
    const merged = mergeCheckInSemanalNutriWrite(serialized, {
      createdAt,
      scheduledDate: '2026-08-23',
      nutritionistId: 'nutri-9',
      automationMeta: { foo: true },
    });
    expect(merged.createdAt).toBe(createdAt);
    expect(merged.scheduledDate).toBe('2026-08-23');
    expect(merged.nutritionistId).toBe('nutri-9');
    expect(merged.automationMeta).toEqual({ foo: true });
    expect(merged.score).toBe(90);
  });

  it('histórico ordena mais recente primeiro', () => {
    const sorted = sortCheckInsSemanaisNewestFirst([
      { weekKey: '2026-08-03' },
      { weekKey: '2026-08-17' },
      { weekKey: '2026-08-10' },
    ]);
    expect(sorted.map((i) => i.weekKey)).toEqual(['2026-08-17', '2026-08-10', '2026-08-03']);
  });
});

describe('canEditWeeklyNutritionCheckIn', () => {
  it('na quarta permite a semana anterior, não a semana em andamento', () => {
    expect(
      canEditWeeklyNutritionCheckIn({
        weekKey: '2026-08-10',
        today: '2026-08-20',
      })
    ).toBe(true);
    expect(
      canEditWeeklyNutritionCheckIn({
        weekKey: '2026-08-17',
        today: '2026-08-20',
      })
    ).toBe(false);
  });

  it('no domingo permite a semana que está fechando', () => {
    expect(
      canEditWeeklyNutritionCheckIn({
        weekKey: '2026-08-17',
        today: '2026-08-23',
      })
    ).toBe(true);
  });

  it('semana mais antiga fica somente leitura', () => {
    expect(
      canEditWeeklyNutritionCheckIn({
        weekKey: '2026-08-03',
        today: '2026-08-20',
      })
    ).toBe(false);
  });

  it('somenteVisualizacao nunca edita', () => {
    expect(
      canEditWeeklyNutritionCheckIn({
        weekKey: '2026-08-17',
        today: '2026-08-17',
        readOnly: true,
      })
    ).toBe(false);
  });

  it('histórico antigo abre em view, não em create', () => {
    expect(
      resolveCheckInSemanalNutriInteraction({
        hasRecord: true,
        canEdit: false,
        requested: 'view',
      })
    ).toBe('view');
    expect(
      resolveCheckInSemanalNutriInteraction({
        hasRecord: true,
        canEdit: false,
        requested: 'edit',
      })
    ).toBe('view');
  });

  it('semana sem registro e edit pedido só abre create se ainda estiver liberado', () => {
    expect(
      resolveCheckInSemanalNutriInteraction({
        hasRecord: false,
        canEdit: true,
        canCreate: false,
        requested: 'edit',
      })
    ).toBe('view');
    expect(
      resolveCheckInSemanalNutriInteraction({
        hasRecord: false,
        canEdit: true,
        canCreate: true,
        requested: 'edit',
      })
    ).toBe('create');
  });
});

describe('ETAPA 02 — isolamento da aplicação', () => {
  it('questionário de /aplicacao permanece com perguntas clínicas de aplicação', () => {
    expect(CHECK_IN_SEMANAL_QUESTIONS.some((q) => q.key === 'localAplicacao')).toBe(true);
    expect(CHECK_IN_SEMANAL_QUESTIONS.some((q) => q.key === 'peso')).toBe(true);
  });
});

describe('weeklyScoreDelta', () => {
  it('mostra diferença simples vs semana anterior', () => {
    expect(weeklyScoreDelta(87, 82)).toBe(5);
    expect(weeklyScoreDelta(80, 85)).toBe(-5);
    expect(weeklyScoreDelta(80, null)).toBeNull();
  });
});
