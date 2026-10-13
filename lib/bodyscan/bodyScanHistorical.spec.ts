import { describe, expect, it } from 'vitest';
import {
  discoverHistoricalBodyScanWeeks,
  evaluateHistoricalWeekEligibility,
  groupProgressPhotosByWeek,
  mapWithConcurrency,
} from '@/lib/bodyscan/discoverHistoricalBodyScanWeeks';

describe('BodyScan historical discovery', () => {
  const height = 170;

  it('1) fotos antigas frontal + perfil → identifica', () => {
    const summary = discoverHistoricalBodyScanWeeks({
      photos: [
        { id: 'f1', tipo: 'frontal', semana: 1, createdAtMs: 1 },
        { id: 's1', tipo: 'perfil', semana: 1, createdAtMs: 2 },
      ],
      evolucao: [{ weekIndex: 1, peso: 90 }],
      heightCm: height,
    });
    expect(summary.foundPhotoWeeks).toBe(1);
    expect(summary.weeksWithFrontAndSide).toBe(1);
    expect(summary.eligibleWeeks).toBe(1);
  });

  it('2) frontal sem perfil → não elegível', () => {
    const summary = discoverHistoricalBodyScanWeeks({
      photos: [{ id: 'f1', tipo: 'frontal', semana: 2, createdAtMs: 1 }],
      evolucao: [{ weekIndex: 2, peso: 90 }],
      heightCm: height,
    });
    expect(summary.eligibleWeeks).toBe(0);
    expect(summary.weeks[0]?.reason).toBe('falta perfil');
  });

  it('3) perfil sem frontal → não elegível', () => {
    const summary = discoverHistoricalBodyScanWeeks({
      photos: [{ id: 's1', tipo: 'perfil', semana: 2, createdAtMs: 1 }],
      evolucao: [{ weekIndex: 2, peso: 90 }],
      heightCm: height,
    });
    expect(summary.eligibleWeeks).toBe(0);
    expect(summary.weeks[0]?.reason).toBe('falta frontal');
  });

  it('4) fotos + peso + altura → elegível', () => {
    const e = evaluateHistoricalWeekEligibility({
      week: 3,
      hasFront: true,
      hasSide: true,
      weightKg: 88,
      heightCm: height,
      frontPhotoId: 'f',
      sidePhotoId: 's',
    });
    expect(e.eligible).toBe(true);
    expect(e.needsGeneration).toBe(true);
  });

  it('5) fotos sem peso → ignora', () => {
    const summary = discoverHistoricalBodyScanWeeks({
      photos: [
        { id: 'f1', tipo: 'frontal', semana: 1, createdAtMs: 1 },
        { id: 's1', tipo: 'perfil', semana: 1, createdAtMs: 1 },
      ],
      evolucao: [],
      heightCm: height,
    });
    expect(summary.eligibleWeeks).toBe(0);
    expect(summary.weeks[0]?.reason).toBe('peso da semana ausente');
  });

  it('6) fotos sem altura → ignora', () => {
    const summary = discoverHistoricalBodyScanWeeks({
      photos: [
        { id: 'f1', tipo: 'frontal', semana: 1, createdAtMs: 1 },
        { id: 's1', tipo: 'perfil', semana: 1, createdAtMs: 1 },
      ],
      evolucao: [{ weekIndex: 1, peso: 90 }],
      heightCm: null,
    });
    expect(summary.eligibleWeeks).toBe(0);
    expect(summary.weeks[0]?.reason).toBe('altura inválida');
  });

  it('7) circunferência ausente → continua elegível', () => {
    const e = evaluateHistoricalWeekEligibility({
      week: 1,
      hasFront: true,
      hasSide: true,
      weightKg: 90,
      heightCm: height,
      abdominalCircumferenceCm: null,
      frontPhotoId: 'f',
      sidePhotoId: 's',
    });
    expect(e.eligible).toBe(true);
  });

  it('8) BodyScan já existente → não precisa gerar', () => {
    const summary = discoverHistoricalBodyScanWeeks({
      photos: [
        { id: 'f1', tipo: 'frontal', semana: 1, createdAtMs: 1 },
        { id: 's1', tipo: 'perfil', semana: 1, createdAtMs: 1 },
      ],
      evolucao: [{ weekIndex: 1, peso: 90 }],
      heightCm: height,
      existingScans: [
        { week: 1, status: 'completed', frontPhotoId: 'f1', sidePhotoId: 's1' },
      ],
    });
    expect(summary.eligibleWeeks).toBe(1);
    expect(summary.alreadyCompleted).toBe(1);
    expect(summary.pendingGeneration).toBe(0);
  });

  it('8b) concluído sem estimativa → semana volta a pendente', () => {
    const summary = discoverHistoricalBodyScanWeeks({
      photos: [
        { id: 'f1', tipo: 'frontal', semana: 1, createdAtMs: 1 },
        { id: 's1', tipo: 'perfil', semana: 1, createdAtMs: 1 },
        { id: 'f4', tipo: 'frontal', semana: 4, createdAtMs: 1 },
      ],
      evolucao: [
        { weekIndex: 1, peso: 90 },
        { weekIndex: 4, peso: 80 },
      ],
      heightCm: height,
      existingScans: [
        {
          week: 1,
          status: 'completed',
          analysisAvailable: false,
          frontPhotoId: 'f1',
          sidePhotoId: 's1',
        },
      ],
    });
    expect(summary.pendingWeeks).toEqual([1]);
    expect(summary.weeks.map((w) => w.week)).toEqual([1, 4]);
    expect(summary.weeks.find((w) => w.week === 4)?.eligible).toBe(false);
    expect(summary.weeks.find((w) => w.week === 4)?.reason).toBe('falta perfil');
  });

  it('9) foto substituída → pode regenerar', () => {
    const summary = discoverHistoricalBodyScanWeeks({
      photos: [
        { id: 'f2', tipo: 'frontal', semana: 1, createdAtMs: 10 },
        { id: 's1', tipo: 'perfil', semana: 1, createdAtMs: 1 },
      ],
      evolucao: [{ weekIndex: 1, peso: 90 }],
      heightCm: height,
      existingScans: [
        { week: 1, status: 'completed', frontPhotoId: 'f1', sidePhotoId: 's1' },
      ],
    });
    expect(summary.pendingGeneration).toBe(1);
  });

  it('10) várias semanas → gera somente ausentes', () => {
    const summary = discoverHistoricalBodyScanWeeks({
      photos: [
        { id: 'f1', tipo: 'frontal', semana: 1, createdAtMs: 1 },
        { id: 's1', tipo: 'perfil', semana: 1, createdAtMs: 1 },
        { id: 'f2', tipo: 'frontal', semana: 2, createdAtMs: 1 },
        { id: 's2', tipo: 'perfil', semana: 2, createdAtMs: 1 },
        { id: 'f3', tipo: 'frontal', semana: 3, createdAtMs: 1 },
        { id: 's3', tipo: 'perfil', semana: 3, createdAtMs: 1 },
      ],
      evolucao: [
        { weekIndex: 1, peso: 92 },
        { weekIndex: 2, peso: 90 },
        { weekIndex: 3, peso: 88 },
      ],
      heightCm: height,
      existingScans: [
        { week: 1, status: 'completed', frontPhotoId: 'f1', sidePhotoId: 's1' },
      ],
    });
    expect(summary.eligibleWeeks).toBe(3);
    expect(summary.alreadyCompleted).toBe(1);
    expect(summary.pendingWeeks).toEqual([2, 3]);
  });

  it('11/12) discovery não envia fotos; consentimento separado não é gate', () => {
    // Discovery é puro e não chama Gemini; BodyScan usa fotos existentes sem consentimento separado.
    const summary = discoverHistoricalBodyScanWeeks({
      photos: [
        { id: 'f1', tipo: 'frontal', semana: 1, createdAtMs: 1 },
        { id: 's1', tipo: 'perfil', semana: 1, createdAtMs: 1 },
      ],
      evolucao: [{ weekIndex: 1, peso: 90 }],
      heightCm: height,
    });
    expect(summary.pendingGeneration).toBe(1);
  });

  it('13) fotos duplicadas na mesma semana → seleciona mais recente', () => {
    const pairs = groupProgressPhotosByWeek([
      { id: 'f-old', tipo: 'frontal', semana: 4, createdAtMs: 1 },
      { id: 'f-new', tipo: 'frontal', semana: 4, createdAtMs: 99 },
      { id: 's-old', tipo: 'perfil', semana: 4, createdAtMs: 2 },
      { id: 's-new', tipo: 'perfil', semana: 4, createdAtMs: 100 },
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.frontPhotoId).toBe('f-new');
    expect(pairs[0]?.sidePhotoId).toBe('s-new');
  });

  it('14) resultado final ordenado por semana', () => {
    const summary = discoverHistoricalBodyScanWeeks({
      photos: [
        { id: 'f3', tipo: 'frontal', semana: 3, createdAtMs: 1 },
        { id: 's3', tipo: 'perfil', semana: 3, createdAtMs: 1 },
        { id: 'f1', tipo: 'frontal', semana: 1, createdAtMs: 1 },
        { id: 's1', tipo: 'perfil', semana: 1, createdAtMs: 1 },
      ],
      evolucao: [
        { weekIndex: 3, peso: 88 },
        { weekIndex: 1, peso: 92 },
      ],
      heightCm: height,
    });
    expect(summary.weeks.map((w) => w.week)).toEqual([1, 3]);
    expect(summary.pendingWeeks).toEqual([1, 3]);
  });

  it('15) concorrência controlada (máx 2)', async () => {
    let running = 0;
    let maxRunning = 0;
    const items = [1, 2, 3, 4, 5];
    await mapWithConcurrency(items, 2, async (n) => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 20));
      running -= 1;
      return n;
    });
    expect(maxRunning).toBeLessThanOrEqual(2);
  });
});
