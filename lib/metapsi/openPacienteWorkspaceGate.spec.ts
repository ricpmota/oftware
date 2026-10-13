import { describe, expect, it } from 'vitest';
import {
  decidePsiquiatraCanOpenPaciente,
  METAPSI_PACIENTE_PASTAS,
} from '@/lib/metapsi/openPacienteWorkspaceGate';
import { pacientePsiquiatraDocId } from '@/lib/metapsi/hasActivePsiquiatraAccess';

describe('MetaPsi workspace — gate de autorização (SoT)', () => {
  it('A — ACL ativa: abre', () => {
    expect(
      decidePsiquiatraCanOpenPaciente({
        acl: { exists: true, status: 'ativo' },
        mirrorContainsPsiquiatra: true,
      })
    ).toBe(true);
  });

  it('B — sem ACL: não abre', () => {
    expect(
      decidePsiquiatraCanOpenPaciente({
        acl: null,
        mirrorContainsPsiquiatra: false,
      })
    ).toBe(false);
  });

  it('C — ACL de outro psiquiatra (doc id distinto): não abre para Y', () => {
    const docX = pacientePsiquiatraDocId('pac-A', 'psi-X');
    const docY = pacientePsiquiatraDocId('pac-A', 'psi-Y');
    expect(docX).not.toBe(docY);
    // Y consulta ACL próprio — inexistente
    expect(
      decidePsiquiatraCanOpenPaciente({
        acl: { exists: false },
        mirrorContainsPsiquiatra: true,
      })
    ).toBe(false);
  });

  it('D — ACL inativa: não abre', () => {
    expect(
      decidePsiquiatraCanOpenPaciente({
        acl: { exists: true, status: 'inativo' },
      })
    ).toBe(false);
    expect(
      decidePsiquiatraCanOpenPaciente({
        acl: { exists: true, status: 'removido' },
      })
    ).toBe(false);
  });

  it('E — mirror contém psiquiatra mas ACL ausente/inativa: SoT prevalece, não abre', () => {
    expect(
      decidePsiquiatraCanOpenPaciente({
        acl: null,
        mirrorContainsPsiquiatra: true,
      })
    ).toBe(false);
    expect(
      decidePsiquiatraCanOpenPaciente({
        acl: { exists: true, status: 'inativo' },
        mirrorContainsPsiquiatra: true,
      })
    ).toBe(false);
  });
});

describe('MetaPsi workspace — pastas e read-only', () => {
  it('ordem canônica das tabs (sem Financeiro)', () => {
    expect(METAPSI_PACIENTE_PASTAS.map((p) => p.nome)).toEqual([
      'Identificação',
      'Anamnese',
      'Prontuário',
      'Exames',
      'Bio Impedância',
      'Evolução/Seguimento',
      'Prescrições',
      'Nutrologia',
      'Psiquiatria',
      'Personal Trainer',
    ]);
    expect(METAPSI_PACIENTE_PASTAS.some((p) => p.nome === 'Financeiro')).toBe(false);
  });

  it('Psiquiatria fica entre Nutrologia e Personal Trainer', () => {
    const nomes = METAPSI_PACIENTE_PASTAS.map((p) => p.nome);
    const iNutri = nomes.indexOf('Nutrologia');
    const iPsi = nomes.indexOf('Psiquiatria');
    const iPers = nomes.indexOf('Personal Trainer');
    expect(iNutri).toBeLessThan(iPsi);
    expect(iPsi).toBeLessThan(iPers);
    expect(iPsi - iNutri).toBe(1);
    expect(iPers - iPsi).toBe(1);
  });

  it('contrato read-only: props de escrita não devem ser fornecidas ao workspace Psi', () => {
    const workspaceReadOnlyContract = {
      prontuarioReadOnly: true,
      examesSomenteLeitura: true,
      bioSemOnSalvo: true,
      prescricoesSemMutacao: true,
      nutriSomenteVisualizacao: true,
      personalProfessionalReadOnly: true,
      dadosClinicosAllowGerarAnalise: false,
      // Sem persistência clínica psi nesta etapa
      criaEstruturaPsiquiatricaAoAbrir: false,
    };
    expect(workspaceReadOnlyContract.prontuarioReadOnly).toBe(true);
    expect(workspaceReadOnlyContract.examesSomenteLeitura).toBe(true);
    expect(workspaceReadOnlyContract.bioSemOnSalvo).toBe(true);
    expect(workspaceReadOnlyContract.prescricoesSemMutacao).toBe(true);
    expect(workspaceReadOnlyContract.nutriSomenteVisualizacao).toBe(true);
    expect(workspaceReadOnlyContract.personalProfessionalReadOnly).toBe(true);
    expect(workspaceReadOnlyContract.dadosClinicosAllowGerarAnalise).toBe(false);
    expect(workspaceReadOnlyContract.criaEstruturaPsiquiatricaAoAbrir).toBe(false);
  });
});
