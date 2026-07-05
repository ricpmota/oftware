import { describe, expect, it } from 'vitest';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import {
  ensureBioRegistroId,
  ensureBioRegistrosIds,
  newBioRegistroId,
  removeRegistroById,
  replaceRegistroById,
  registrosMatchLegacy,
} from '@/utils/bioImpedanciaRegistroId';

function mockRegistro(partial: Partial<BioImpedanciaRegistro> & { dataRegistro: Date; peso: number }): BioImpedanciaRegistro {
  return {
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
    ...partial,
  };
}

describe('bioImpedanciaRegistroId', () => {
  it('ensureBioRegistroId é estável para o mesmo registro legado', () => {
    const r = mockRegistro({ dataRegistro: new Date('2024-06-01'), peso: 70 });
    const a = ensureBioRegistroId(r);
    const b = ensureBioRegistroId(r);
    expect(a.id).toBe(b.id);
    expect(a.id).toMatch(/^bio_\d+_\d+$/);
  });

  it('preserve id existente', () => {
    const r = mockRegistro({ id: 'bio_existing_1', dataRegistro: new Date(), peso: 68 });
    expect(ensureBioRegistroId(r).id).toBe('bio_existing_1');
  });

  it('replaceRegistroById edita o registro correto em lista não ordenada', () => {
    const antigo = mockRegistro({ id: 'bio_a', dataRegistro: new Date('2024-01-01'), peso: 80 });
    const meio = mockRegistro({ id: 'bio_b', dataRegistro: new Date('2024-06-01'), peso: 75 });
    const recente = mockRegistro({ id: 'bio_c', dataRegistro: new Date('2024-12-01'), peso: 70 });
    const lista = [recente, antigo, meio];

    const atualizado = { ...meio, peso: 74, gorduraVisceral: 9 };
    const novos = replaceRegistroById(lista, 'bio_b', atualizado);

    expect(novos.find((r) => r.id === 'bio_b')?.peso).toBe(74);
    expect(novos.find((r) => r.id === 'bio_a')?.peso).toBe(80);
    expect(novos.find((r) => r.id === 'bio_c')?.peso).toBe(70);
  });

  it('removeRegistroById remove apenas o id correto', () => {
    const a = mockRegistro({ id: 'bio_a', dataRegistro: new Date('2024-01-01'), peso: 80 });
    const b = mockRegistro({ id: 'bio_b', dataRegistro: new Date('2024-06-01'), peso: 75 });
    const novos = removeRegistroById([a, b], 'bio_a');
    expect(novos).toHaveLength(1);
    expect(novos[0].id).toBe('bio_b');
  });

  it('registrosMatchLegacy compara data e peso', () => {
    const a = mockRegistro({ dataRegistro: new Date('2024-03-15'), peso: 69.8 });
    const b = mockRegistro({ dataRegistro: new Date('2024-03-15'), peso: 69.85 });
    expect(registrosMatchLegacy(a, b)).toBe(true);
  });

  it('newBioRegistroId gera ids únicos', () => {
    const id1 = newBioRegistroId();
    const id2 = newBioRegistroId();
    expect(id1).not.toBe(id2);
  });

  it('ensureBioRegistrosIds aplica a todos', () => {
    const regs = [
      mockRegistro({ dataRegistro: new Date('2024-01-01'), peso: 80 }),
      mockRegistro({ id: 'keep', dataRegistro: new Date('2024-06-01'), peso: 75 }),
    ];
    const out = ensureBioRegistrosIds(regs);
    expect(out[0].id).toBeTruthy();
    expect(out[1].id).toBe('keep');
  });
});
