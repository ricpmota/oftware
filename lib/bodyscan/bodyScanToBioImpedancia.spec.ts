import { describe, expect, it } from 'vitest';
import type { BodyScanPublicView } from '@/lib/bodyscan/bodyScanSerialize';
import {
  bioCalendarDayKey,
  buildBioRegistroFromBodyScan,
  findBioRegistrosSameDay,
} from '@/lib/bodyscan/bodyScanToBioImpedancia';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';

function sampleScan(overrides?: Partial<BodyScanPublicView>): BodyScanPublicView {
  return {
    id: 'week-3',
    week: 3,
    date: '2026-03-15',
    status: 'completed',
    analysisAvailable: true,
    input: {
      weightKg: 90,
      abdominalCircumferenceCm: 98,
      heightCm: 170,
      bmi: 31.1,
      frontPhotoId: 'f1',
      sidePhotoId: 's1',
    },
    bodyFat: {
      estimatedMinPercent: 28,
      estimatedCentralPercent: 30,
      estimatedMaxPercent: 32,
    },
    estimatedFatMassKg: { min: 24, central: 27, max: 29 },
    estimatedFatFreeMassKg: { min: 58, central: 63, max: 66 },
    ...overrides,
  };
}

describe('bodyScanToBioImpedancia', () => {
  it('monta registro com campos principais da semana analisada', () => {
    const reg = buildBioRegistroFromBodyScan(sampleScan());
    expect(reg).not.toBeNull();
    expect(reg!.peso).toBe(90);
    expect(reg!.percentualGordura).toBe(30);
    expect(reg!.massaGorduraKg).toBe(27);
    expect(reg!.massaMuscularKg).toBe(63);
    expect(reg!.imc).toBe(31.1);
    expect(reg!.circunferenciaAbdominalCm).toBe(98);
    expect(bioCalendarDayKey(reg!.dataRegistro)).toBe('2026-03-15');
  });

  it('permite sobrescrever data (fluxo outra data)', () => {
    const reg = buildBioRegistroFromBodyScan(sampleScan(), { dataRegistroYmd: '2026-03-20' });
    expect(bioCalendarDayKey(reg!.dataRegistro)).toBe('2026-03-20');
  });

  it('detecta conflito no mesmo dia', () => {
    const existing: BioImpedanciaRegistro[] = [
      {
        id: 'bio_1',
        dataRegistro: new Date(2026, 2, 15, 12, 0, 0),
        peso: 91,
        composicaoCorporal: { aguaTotalLitros: 0, proteinasKg: 0, mineraisKg: 0, massaGorduraKg: 0 },
        analiseMusculoGordura: { massaMuscularKg: 0, massaGorduraKg: 0 },
        analiseObesidade: { percentualGordura: 0 },
        massaMagraSegmentar: {
          arm_r: { kg: 0, percentual: 0 },
          arm_l: { kg: 0, percentual: 0 },
          trunk: { kg: 0, percentual: 0 },
          leg_r: { kg: 0, percentual: 0 },
          leg_l: { kg: 0, percentual: 0 },
        },
      },
    ];
    expect(findBioRegistrosSameDay(existing, '2026-03-15')).toHaveLength(1);
    expect(findBioRegistrosSameDay(existing, '2026-03-16')).toHaveLength(0);
  });

  it('não monta se análise indisponível', () => {
    expect(
      buildBioRegistroFromBodyScan(sampleScan({ analysisAvailable: false }))
    ).toBeNull();
  });
});
