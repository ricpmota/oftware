import { describe, expect, it } from 'vitest';
import {
  countActiveSharesForMedicoPsiquiatra,
  countTotalActiveSharesForMedico,
  estadosComPsiquiatrasCadastrados,
  filterPsiquiatrasEquipeByQuery,
  METAADMIN_PSIQUIATRAS_MENU_ORDER,
  type AclShareLike,
} from '@/lib/metaadmin/psiquiatrasEquipePage';

const shares: AclShareLike[] = [
  { medicoId: 'med-1', psiquiatraId: 'psi-A', status: 'ativo', pacienteId: 'pac-1' },
  { medicoId: 'med-1', psiquiatraId: 'psi-A', status: 'ativo', pacienteId: 'pac-2' },
  { medicoId: 'med-1', psiquiatraId: 'psi-A', status: 'ativo', pacienteId: 'pac-3' },
  { medicoId: 'med-1', psiquiatraId: 'psi-A', status: 'inativo', pacienteId: 'pac-4' },
  { medicoId: 'med-2', psiquiatraId: 'psi-A', status: 'ativo', pacienteId: 'pac-5' },
  { medicoId: 'med-1', psiquiatraId: 'psi-B', status: 'ativo', pacienteId: 'pac-6' },
];

describe('MetaAdmin Psiquiatras — contagem ACL', () => {
  it('A — médico sem shares: total 0', () => {
    expect(countTotalActiveSharesForMedico([], 'med-1')).toBe(0);
    expect(countActiveSharesForMedicoPsiquiatra([], 'med-1', 'psi-A')).toBe(0);
  });

  it('B/C — psiquiatra A com três ACLs ativas do médico 1: 3', () => {
    expect(countActiveSharesForMedicoPsiquiatra(shares, 'med-1', 'psi-A')).toBe(3);
  });

  it('D — ACL inativa não entra na contagem', () => {
    expect(countActiveSharesForMedicoPsiquiatra(shares, 'med-1', 'psi-A')).toBe(3);
    expect(
      shares.filter(
        (s) =>
          s.medicoId === 'med-1' &&
          s.psiquiatraId === 'psi-A' &&
          s.status === 'inativo'
      )
    ).toHaveLength(1);
  });

  it('E — share de outro médico não entra na contagem do médico atual', () => {
    expect(countActiveSharesForMedicoPsiquiatra(shares, 'med-1', 'psi-A')).toBe(3);
    expect(countActiveSharesForMedicoPsiquiatra(shares, 'med-2', 'psi-A')).toBe(1);
  });

  it('KPI total do médico soma só suas ACLs ativas', () => {
    // med-1: pac-1,2,3 (A) + pac-6 (B) = 4; pac-4 inativo e pac-5 de med-2 fora
    expect(countTotalActiveSharesForMedico(shares, 'med-1')).toBe(4);
  });
});

describe('MetaAdmin Psiquiatras — busca e menu', () => {
  it('busca por nome, CRM e cidade', () => {
    const list = [
      {
        nome: 'Dra. Ana',
        registroNumero: '123456',
        crmUf: 'SP',
        cidades: [{ cidade: 'São Paulo', estado: 'SP' }],
      },
      {
        nome: 'Dr. Bruno',
        registroNumero: '999',
        crmUf: 'RJ',
        cidades: [{ cidade: 'Niterói', estado: 'RJ' }],
      },
    ];
    expect(filterPsiquiatrasEquipeByQuery(list, 'ana')).toHaveLength(1);
    expect(filterPsiquiatrasEquipeByQuery(list, '123')).toHaveLength(1);
    expect(filterPsiquiatrasEquipeByQuery(list, 'niterói')).toHaveLength(1);
    expect(filterPsiquiatrasEquipeByQuery(list, 'xyz')).toHaveLength(0);
  });

  it('ordem do menu: Nutricionistas → Psiquiatras → Personal', () => {
    expect([...METAADMIN_PSIQUIATRAS_MENU_ORDER]).toEqual([
      'nutricionistas',
      'psiquiatras',
      'personal',
    ]);
  });

  it('estados do select só incluem UFs com psiquiatra cadastrado', () => {
    expect(
      estadosComPsiquiatrasCadastrados([
        { cidades: [{ cidade: 'São Paulo', estado: 'SP' }] },
        { cidades: [{ cidade: 'Niterói', estado: 'RJ' }, { cidade: 'Campinas', estado: 'sp' }] },
        { cidades: [] },
        null,
      ])
    ).toEqual(['RJ', 'SP']);
  });
});

describe('MetaAdmin Psiquiatras — remoção bloqueada com pacientes', () => {
  it('H — com ACL ativa, contagem > 0 (UI deve bloquear antes do service)', () => {
    const qtd = countActiveSharesForMedicoPsiquiatra(shares, 'med-1', 'psi-A');
    expect(qtd).toBeGreaterThan(0);
  });
});
