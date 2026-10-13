import { describe, expect, it } from 'vitest';
import {
  canAdministerPsiquiatriaShare,
  PSIQUIATRIA_AREA_ORDER,
  PSIQUIATRIA_CONTENT_MODES,
  PSIQUIATRIA_ETAPA5_NO_PERSISTENCE,
  PSIQUIATRIA_PASTA_IDS,
  resolvePsiquiatriaModeForPortal,
} from '@/lib/psiquiatria/psiquiatriaModule';
import {
  formatPsiquiatraResponsavelTitulo,
  mapPsiquiatraToResponsavelView,
} from '@/lib/psiquiatria/resolvePsiquiatraResponsavel';
import { METAPSI_PACIENTE_PASTAS } from '@/lib/metapsi/openPacienteWorkspaceGate';

describe('ETAPA 5 — módulo Psiquiatria transversal', () => {
  it('A — /metapsi é owner', () => {
    expect(resolvePsiquiatriaModeForPortal('metapsi')).toBe('owner');
  });

  it('B/C — /metaadmin, /metanutri, /metapersonal são readonly', () => {
    expect(resolvePsiquiatriaModeForPortal('metaadmin')).toBe('readonly');
    expect(resolvePsiquiatriaModeForPortal('metanutri')).toBe('readonly');
    expect(resolvePsiquiatriaModeForPortal('metapersonal')).toBe('readonly');
  });

  it('F/G — só metaadmin administra share Psi', () => {
    expect(canAdministerPsiquiatriaShare('metaadmin')).toBe(true);
    expect(canAdministerPsiquiatriaShare('metanutri')).toBe(false);
    expect(canAdministerPsiquiatriaShare('metapersonal')).toBe(false);
    expect(canAdministerPsiquiatriaShare('metapsi')).toBe(false);
  });

  it('H/I — etapa 5 não persiste dados clínicos', () => {
    expect(PSIQUIATRIA_ETAPA5_NO_PERSISTENCE).toBe(true);
  });

  it('L — IDs Psi não renumeram Nutrologia(8)/Personal(9)', () => {
    expect(PSIQUIATRIA_PASTA_IDS.metanutri).toBe(14);
    expect(PSIQUIATRIA_PASTA_IDS.metapersonal).toBe(14);
    expect(PSIQUIATRIA_PASTA_IDS.metanutri).not.toBe(8);
    expect(PSIQUIATRIA_PASTA_IDS.metanutri).not.toBe(9);
  });

  it('ordem conceitual Nutrologia → Psiquiatria → Personal', () => {
    expect([...PSIQUIATRIA_AREA_ORDER]).toEqual([
      'Nutrologia',
      'Psiquiatria',
      'Personal Trainer',
    ]);
  });

  it('MetaPsi mantém Psiquiatria entre Nutrologia e Personal (id 9)', () => {
    const nomes = METAPSI_PACIENTE_PASTAS.map((p) => p.nome);
    expect(nomes.indexOf('Nutrologia')).toBeLessThan(nomes.indexOf('Psiquiatria'));
    expect(nomes.indexOf('Psiquiatria')).toBeLessThan(nomes.indexOf('Personal Trainer'));
    expect(PSIQUIATRIA_PASTA_IDS.metapsi).toBe(9);
  });

  it('contrato mode explícito (sem modoPsiquiatra ambíguo)', () => {
    expect([...PSIQUIATRIA_CONTENT_MODES]).toEqual(['owner', 'readonly']);
  });

  it('formata Psiquiatra responsável (CRM/UF)', () => {
    const view = mapPsiquiatraToResponsavelView({
      id: 'u1',
      userId: 'u1',
      nome: 'Ana Silva',
      registroNumero: '12345',
      crmUf: 'SP',
      rqe: '678',
      genero: 'F',
    });
    expect(formatPsiquiatraResponsavelTitulo(view)).toBe('Dra. Ana Silva');
    expect(view.crmLabel).toBe('12345 / SP');
    expect(view.rqe).toBe('678');
  });
});
