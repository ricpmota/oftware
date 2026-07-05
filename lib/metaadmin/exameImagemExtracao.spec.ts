import { describe, expect, it } from 'vitest';
import { mergeExameImagemExtracoes, type ExameImagemExtracaoNormalizada } from './exameImagemExtracao';

describe('mergeExameImagemExtracoes', () => {
  it('prioriza tipo não-desconhecido e primeira data/nome', () => {
    const a: ExameImagemExtracaoNormalizada = {
      nomePacienteDocumento: 'Maria Silva',
      dataExame: '2024-01-10',
      tipoExame: 'desconhecido',
      resumoEquipamentoOuRegiao: 'USG',
      avisos: ['p1'],
    };
    const b: ExameImagemExtracaoNormalizada = {
      nomePacienteDocumento: null,
      dataExame: null,
      tipoExame: 'usg',
      resumoEquipamentoOuRegiao: 'USG abdome total',
      avisos: ['p2'],
    };
    const m = mergeExameImagemExtracoes([a, b]);
    expect(m.nomePacienteDocumento).toBe('Maria Silva');
    expect(m.dataExame).toBe('2024-01-10');
    expect(m.tipoExame).toBe('usg');
    expect(m.resumoEquipamentoOuRegiao).toBe('USG abdome total');
    expect(m.avisos).toContain('p1');
    expect(m.avisos).toContain('p2');
  });

  it('detecta nomes divergentes entre partes', () => {
    const p1: ExameImagemExtracaoNormalizada = {
      nomePacienteDocumento: 'João A',
      dataExame: null,
      tipoExame: 'tomografia',
      resumoEquipamentoOuRegiao: null,
      avisos: [],
    };
    const p2: ExameImagemExtracaoNormalizada = {
      nomePacienteDocumento: 'Maria B',
      dataExame: null,
      tipoExame: 'tomografia',
      resumoEquipamentoOuRegiao: null,
      avisos: [],
    };
    const m = mergeExameImagemExtracoes([p1, p2]);
    expect(m.avisos.some((x) => x.includes('Nomes de paciente diferentes'))).toBe(true);
  });
});
