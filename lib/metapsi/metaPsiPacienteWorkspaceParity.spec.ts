import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { METAPSI_PACIENTE_PASTAS } from '@/lib/metapsi/openPacienteWorkspaceGate';

const root = process.cwd();
const workspaceSrc = readFileSync(
  join(root, 'components/metapsi/MetaPsiPacienteWorkspaceModal.tsx'),
  'utf8',
);
const psiquiatriaTabSrc = readFileSync(
  join(root, 'components/metapsi/MetaPsiPsiquiatriaTab.tsx'),
  'utf8',
);
const shellCssSrc = readFileSync(join(root, 'app/metanutri/metanutri-shell.css'), 'utf8');
const layoutSrc = readFileSync(join(root, 'app/metapsi/layout.tsx'), 'utf8');
const nutriPageSrc = readFileSync(join(root, 'app/metanutri/page.v2.tsx'), 'utf8');

describe('MetaPsi workspace — paridade visual 6.3.5 (estrutura)', () => {
  it('G — reutiliza PacienteModalHeader', () => {
    expect(workspaceSrc).toContain("from '@/components/metaadmin/paciente-modal/PacienteModalHeader'");
    expect(workspaceSrc).toContain('<PacienteModalHeader');
  });

  it('H — utiliza mn-pastas* e CSS compartilhado', () => {
    expect(workspaceSrc).toContain('className="mn-pastas');
    expect(workspaceSrc).toContain('mn-pastas-top');
    expect(workspaceSrc).toContain('mn-pastas-nav');
    expect(workspaceSrc).toContain('mn-pastas-item');
    expect(workspaceSrc).toContain('mn-pastas-item-icon');
    expect(workspaceSrc).toContain('mn-pastas-label');
    expect(workspaceSrc).toContain('data-mn-pastas-open');
    expect(layoutSrc).toContain('metanutri-shell.css');
    expect(shellCssSrc).toContain('.mn-pastas');
  });

  it('I — pasta ativa segue padrão Nutri (green)', () => {
    expect(workspaceSrc).toContain('bg-green-100 text-green-700 border-r-2 border-green-500');
    expect(workspaceSrc).toContain('border-green-500 bg-green-50 text-green-700');
    expect(nutriPageSrc).toContain('bg-green-100 text-green-700 border-r-2 border-green-500');
  });

  it('J — sem CTA indigo exclusivo no shell', () => {
    expect(workspaceSrc).not.toMatch(/indigo/);
    expect(workspaceSrc).toContain('bg-green-600');
    expect(workspaceSrc).toContain('border-gray-300');
  });

  it('K — loading principal com spinner (não só texto)', () => {
    expect(workspaceSrc).toContain('animate-spin');
    expect(workspaceSrc).toContain('border-green-600');
    expect(workspaceSrc).toContain('data-metapsi-workspace-loading');
    expect(workspaceSrc).not.toContain('Validando acesso e carregando paciente');
  });

  it('L — tabs/IDs canônicos preservados', () => {
    expect(METAPSI_PACIENTE_PASTAS.map((p) => p.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(METAPSI_PACIENTE_PASTAS.find((p) => p.id === 9)?.nome).toBe('Psiquiatria');
    expect(METAPSI_PACIENTE_PASTAS.some((p) => p.nome === 'Financeiro')).toBe(false);
  });

  it('M — Psiquiatria sem persistência clínica nova', () => {
    expect(psiquiatriaTabSrc).toContain('PsiquiatriaContent');
    expect(psiquiatriaTabSrc).toContain('mode="owner"');
    expect(workspaceSrc).toContain('<MetaPsiPsiquiatriaTab');
    expect(workspaceSrc).not.toMatch(/criaEstrutura|salvarDiagnostico|persist.*psiquiat/i);
  });

  it('backdrop/container z-index alinhados ao Nutri', () => {
    expect(workspaceSrc).toContain('z-[9999]');
    expect(workspaceSrc).toContain('z-[80]');
    expect(workspaceSrc).toContain('bg-black/50');
    expect(workspaceSrc).toContain('h-[90vh]');
    expect(workspaceSrc).toContain('max-w-7xl');
    expect(nutriPageSrc).toContain('z-[9999]');
    expect(nutriPageSrc).toContain('z-[80]');
  });

  it('gate ACL antes do conteúdo (assertPsiquiatraCanOpenPaciente)', () => {
    expect(workspaceSrc).toContain('assertPsiquiatraCanOpenPaciente');
    const gateIdx = workspaceSrc.indexOf('assertPsiquiatraCanOpenPaciente');
    const getIdx = workspaceSrc.indexOf('PacienteService.getPacienteById');
    expect(gateIdx).toBeGreaterThan(-1);
    expect(getIdx).toBeGreaterThan(gateIdx);
  });

  it('Prontuário create-only Psi (6.4.1) — sem delete global', () => {
    expect(workspaceSrc).toContain('canCreateConsulta');
    expect(workspaceSrc).toContain('consultaAuthorRole="psiquiatra"');
    expect(workspaceSrc).toMatch(/readOnly\s*\n\s*canCreateConsulta/);
  });

  it('não vaza dados no header durante loading/erro de ACL', () => {
    expect(workspaceSrc).toContain(
      "patientName={loading || !aclOk || !paciente ? 'Paciente' : nomePaciente}",
    );
    expect(workspaceSrc).toContain(
      'dataNascimento={aclOk && paciente ? paciente.dadosIdentificacao?.dataNascimento : undefined}',
    );
  });

  it('troca de paciente reseta pasta/erro/dados', () => {
    expect(workspaceSrc).toContain('setPaciente(null)');
    expect(workspaceSrc).toContain('setPastaAtiva(1)');
    expect(workspaceSrc).toContain('setAclOk(false)');
    expect(workspaceSrc).toContain('setErro(null)');
    expect(workspaceSrc).toContain('setTabletPastasOpen(false)');
  });

  it('navegação mobile horizontal + Brain em Psiquiatria', () => {
    expect(workspaceSrc).toContain('data-metapsi-workspace-mobile-tabs');
    expect(workspaceSrc).toContain('lg:hidden');
    expect(workspaceSrc).toContain('Brain');
    expect(workspaceSrc).toMatch(/p\.id === 9[\s\S]*\? Brain/);
  });

  it('pasta inicial = Identificação (1)', () => {
    expect(workspaceSrc).toContain('useState(1)');
    expect(workspaceSrc).toContain('setPastaAtiva(1)');
  });
});
