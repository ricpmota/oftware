import { describe, expect, it } from 'vitest';
import {
  buildBinocularComparisons,
  detectEyeFromExtraction,
  getBinocularStatusLabel,
  normalizeEye,
} from '@/lib/oftpay/laudoOftalmoEye';

describe('normalizeEye', () => {
  it('normaliza valores básicos', () => {
    expect(normalizeEye('OD')).toBe('od');
    expect(normalizeEye('oe')).toBe('oe');
    expect(normalizeEye('ou')).toBe('ao');
    expect(normalizeEye('')).toBe('nao_informado');
  });
});

describe('detectEyeFromExtraction', () => {
  it('detecta OD por texto simples', () => {
    const d = detectEyeFromExtraction({ rawSummary: 'Achados em olho direito (OD).' });
    expect(d.detectedEye).toBe('od');
    expect(d.eyeConfidence).toBeGreaterThan(0.7);
  });
});

describe('buildBinocularComparisons', () => {
  it('gera assimetria em OCT disco com RNFL diferente', () => {
    const out = buildBinocularComparisons([
      {
        id: '1',
        fileName: 'od.pdf',
        examType: 'oct_disco',
        eye: 'od',
        camposEstruturados: { rnfl_global: '70', rnfl_superior: '75', rnfl_inferior: '70', escavacao: '0.7' },
      },
      {
        id: '2',
        fileName: 'oe.pdf',
        examType: 'oct_disco',
        eye: 'oe',
        camposEstruturados: { rnfl_global: '96', rnfl_superior: '100', rnfl_inferior: '97', escavacao: '0.4' },
      },
    ]);

    expect(out.length).toBe(1);
    expect(out[0].status === 'marked_asymmetry' || out[0].status === 'mild_asymmetry').toBe(true);
    expect(out[0].keyAsymmetries.length).toBeGreaterThan(0);
    expect(getBinocularStatusLabel(out[0].status)).toMatch(/Assimetria|Semelhante|Dados/);
  });
});
