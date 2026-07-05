import { describe, expect, it } from 'vitest';
import { estimarPerdaPrevistaPacote } from '@/lib/planoTerapeutico/perdaPesoPacote';

describe('estimarPerdaPrevistaPacote', () => {
  it('mensal usa 4 semanas e não a meta do paciente', () => {
    const r = estimarPerdaPrevistaPacote({
      modalidade: 'mensal',
      duracaoSemanas: 4,
      pesoAtualKg: 100,
      metaPacienteKg: 15,
      metaPercentual: 12,
    });
    expect(r.perdaPrevistaKg).toBeLessThan(15);
    expect(r.metaSuperiorAoPrevisto).toBe(false);
    expect(r.usaMetaPacienteNaCurva).toBe(false);
  });

  it('sinaliza manutenção quando meta ultrapassa 22% do peso', () => {
    const r = estimarPerdaPrevistaPacote({
      modalidade: 'mensal',
      duracaoSemanas: 4,
      pesoAtualKg: 100,
      metaPacienteKg: 25,
      metaPercentual: 25,
    });
    expect(r.metaSuperiorAoPrevisto).toBe(true);
    expect(r.perdaPrevistaKg).toBeLessThanOrEqual(22);
  });

  it('mensal usa benchmark OI da faixa (não fallback 0,4 kg/sem)', () => {
    const r = estimarPerdaPrevistaPacote({
      modalidade: 'mensal',
      duracaoSemanas: 4,
      pesoAtualKg: 100,
      metaPacienteKg: 15,
      metaPercentual: 12,
    });
    expect(r.fontePerda).toBe('oi_benchmark');
    expect(r.perdaSemanalKg).toBeGreaterThan(0.5);
    expect(r.perdaSemanalKg).not.toBe(0.4);
  });

  it('personalizado usa meta do paciente na curva', () => {
    const r = estimarPerdaPrevistaPacote({
      modalidade: 'personalizado',
      duracaoSemanas: 24,
      pesoAtualKg: 90,
      metaPacienteKg: 10,
      metaPercentual: 10,
    });
    expect(r.perdaPrevistaKg).toBe(10);
    expect(r.usaMetaPacienteNaCurva).toBe(true);
  });
});
