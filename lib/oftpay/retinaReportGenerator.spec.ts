import { describe, expect, it } from 'vitest';
import type { RetinaFinding } from '@/types/oftpay/retinaMap';
import { describeMapFindingsGrouped } from '@/lib/oftpay/retinaReportGenerator';

function drusaFinding(id: string, overrides: Partial<RetinaFinding> = {}): RetinaFinding {
  return {
    id,
    eye: 'OD',
    section: 'macula',
    structuredKey: 'macula.drusas',
    type: 'drusa',
    x: 0.5,
    y: 0.5,
    region: 'macula',
    quadrant: 'ST',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('describeMapFindingsGrouped', () => {
  it('agrupa múltiplas drusas na mesma região em uma única frase', () => {
    const findings = Array.from({ length: 16 }, (_, i) => drusaFinding(`d-${i}`));
    const text = describeMapFindingsGrouped(findings);

    expect(text).toBe(
      'Presença de múltiplos pontos amarelados dispersos em região macular, sugestivos de drusas.'
    );
    expect(text.match(/drusas/g)?.length).toBe(1);
  });

  it('lista regiões distintas quando os pontos estão em locais diferentes', () => {
    const findings = [
      drusaFinding('d-1', { region: 'macula', quadrant: 'ST' }),
      drusaFinding('d-2', {
        region: 'polo_posterior',
        quadrant: 'IT',
        section: 'macula',
      }),
    ];
    const text = describeMapFindingsGrouped(findings);

    expect(text).toContain('região macular');
    expect(text).toContain('polo posterior');
    expect(text.match(/drusas/g)?.length).toBe(1);
  });
});
