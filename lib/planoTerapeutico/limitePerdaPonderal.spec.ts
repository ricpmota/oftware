import { describe, expect, it } from 'vitest';
import {
  perdaPonderalMaximaKg,
  PERDA_PONDERAL_MAX_PERCENTUAL,
  resolverMetaPerdaComLimite,
} from '@/lib/planoTerapeutico/limitePerdaPonderal';

describe('limitePerdaPonderal', () => {
  it('teto de 22% do peso', () => {
    expect(PERDA_PONDERAL_MAX_PERCENTUAL).toBe(22);
    expect(perdaPonderalMaximaKg(100)).toBe(22);
    expect(perdaPonderalMaximaKg(80)).toBe(17.6);
  });

  it('meta abaixo do teto permanece igual', () => {
    const r = resolverMetaPerdaComLimite(100, 15, null);
    expect(r.perdaEfetivaKg).toBe(15);
    expect(r.perdaEfetivaPercentual).toBe(15);
    expect(r.possuiFaseManutencao).toBe(false);
  });

  it('meta acima de 22% gera fase de manutenção', () => {
    const r = resolverMetaPerdaComLimite(100, 30, null);
    expect(r.perdaEfetivaKg).toBe(22);
    expect(r.perdaEfetivaPercentual).toBe(22);
    expect(r.manutencaoKg).toBe(8);
    expect(r.manutencaoPercentual).toBe(8);
    expect(r.possuiFaseManutencao).toBe(true);
    expect(r.metaPacienteKg).toBe(30);
  });

  it('resolve por percentual cadastrado', () => {
    const r = resolverMetaPerdaComLimite(100, null, 24.5);
    expect(r.perdaEfetivaPercentual).toBe(22);
    expect(r.manutencaoPercentual).toBe(2.5);
  });
});
