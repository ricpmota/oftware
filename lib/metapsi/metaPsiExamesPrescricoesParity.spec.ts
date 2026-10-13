import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('MetaPsi Exames/Prescrições — paridade MetaNutri', () => {
  const examesSrc = readFileSync(
    join(root, 'components/metapsi/MetaPsiExamesReadonlyTab.tsx'),
    'utf8'
  );
  const prescSrc = readFileSync(
    join(root, 'components/metapsi/MetaPsiPrescricoesReadonlyTab.tsx'),
    'utf8'
  );
  const examesProfSrc = readFileSync(
    join(root, 'components/profissional/exames/ProfissionalExamesPacienteTab.tsx'),
    'utf8'
  );
  const prescProfSrc = readFileSync(
    join(root, 'components/profissional/prescricao/ProfissionalPrescricoesPacienteReadonlyTab.tsx'),
    'utf8'
  );
  const workspaceSrc = readFileSync(
    join(root, 'components/metapsi/MetaPsiPacienteWorkspaceModal.tsx'),
    'utf8'
  );

  it('Exames usa componente profissional (chrome verde Nutri)', () => {
    expect(examesSrc).toContain('ProfissionalExamesPacienteTab');
    expect(examesProfSrc).toContain('border-green-600 bg-green-100 text-green-900');
    expect(examesProfSrc).toContain('Exames Laboratoriais');
    expect(examesProfSrc).toContain('Exames de Imagem');
    expect(examesProfSrc).toContain('LabResultCard');
    expect(examesProfSrc).toContain('somenteLeitura');
    expect(examesProfSrc).not.toMatch(/indigo-600/);
  });

  it('Prescrições usa chrome Nutri RO (busca + abas + split)', () => {
    expect(prescSrc).toContain('ProfissionalPrescricoesPacienteReadonlyTab');
    expect(prescProfSrc).toContain('PrescricaoBuscaCampo');
    expect(prescProfSrc).toContain('PrescricaoHistoricoTab');
    expect(prescProfSrc).toContain('accent="green"');
    expect(prescProfSrc).toContain('readOnly');
    expect(prescProfSrc).not.toContain('Nova');
    expect(prescProfSrc).toContain('somente leitura');
  });

  it('Workspace MetaPsi passa paciente completo às abas', () => {
    expect(workspaceSrc).toContain('<MetaPsiExamesReadonlyTab paciente={paciente}');
    expect(workspaceSrc).toContain('<MetaPsiPrescricoesReadonlyTab paciente={paciente}');
    expect(workspaceSrc).not.toContain('MetaPsiPrescricoesReadonlyTab pacienteId=');
  });
});
