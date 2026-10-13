import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  formatPsiquiatraAutorSnapshot,
  isTipoRegistroConsultaPsi,
  montarDescricaoConsultaPsi,
  montarTituloConsultaPsi,
  temInformacaoClinicaConsultaPsi,
  TIPOS_REGISTRO_CONSULTA_PSI,
} from '@/lib/metapsi/prontuarioConsultaPsiquiatra';

const root = process.cwd();

describe('MetaPsi prontuário transversal 6.4.1', () => {
  it('origem psiquiatra existe no tipo compartilhado', () => {
    const typesSrc = readFileSync(
      join(root, 'app/metaadmin/components/paciente-modal/prontuario/prontuarioTypes.ts'),
      'utf8'
    );
    expect(typesSrc).toMatch(/EventoTimelineOrigem[\s\S]*'psiquiatra'/);
  });

  it('LABEL_ORIGEM mapeia psiquiatra → Psiquiatra', () => {
    const timelineSrc = readFileSync(
      join(root, 'app/metaadmin/components/paciente-modal/prontuario/ProntuarioTimeline.tsx'),
      'utf8'
    );
    expect(timelineSrc).toContain("psiquiatra: 'Psiquiatra'");
  });

  it('API MetaPsi POST prontuário existe com gates', () => {
    const routeSrc = readFileSync(
      join(root, 'app/api/metapsi/pacientes/[pacienteId]/prontuario/route.ts'),
      'utf8'
    );
    expect(routeSrc).toContain('requirePsiquiatraMetaPsi');
    expect(routeSrc).toContain('createProntuarioConsultaPsiquiatra');
    expect(routeSrc).toContain('auth.uid');
  });

  it('server write revalida ACL ativo (não mirror)', () => {
    const serverSrc = readFileSync(
      join(root, 'lib/metapsi/createProntuarioConsultaPsiquiatra.server.ts'),
      'utf8'
    );
    const aclSrc = readFileSync(
      join(root, 'lib/metapsi/hasActivePsiquiatraAccess.server.ts'),
      'utf8'
    );
    expect(serverSrc).toContain('hasActivePsiquiatraAccessAdmin');
    expect(serverSrc).toContain("origem: 'psiquiatra'");
    expect(serverSrc).toContain('psiquiatraNome');
    expect(aclSrc).toContain('COL_PACIENTE_PSIQUIATRA');
    expect(aclSrc).toContain('PSIQUIATRA_STATUS.ATIVO');
    expect(aclSrc).toMatch(/NÃO autorizam/);
    // Autorização usa só a collection SoT — mirror não aparece na query.
    expect(aclSrc).not.toMatch(/\.psiquiatraVinculadoIds|get\(.*psiquiatraVinculadoIds/);
  });

  it('MetaPsi workspace: create-only (não readOnly=false global)', () => {
    const workspaceSrc = readFileSync(
      join(root, 'components/metapsi/MetaPsiPacienteWorkspaceModal.tsx'),
      'utf8'
    );
    const tabSrc = readFileSync(
      join(root, 'app/metaadmin/components/paciente-modal/prontuario/ProntuarioTab.tsx'),
      'utf8'
    );
    expect(workspaceSrc).toContain('canCreateConsulta');
    expect(workspaceSrc).toContain('consultaAuthorRole="psiquiatra"');
    expect(workspaceSrc).toContain('psiquiatraId={psiquiatraId}');
    expect(workspaceSrc).toMatch(/readOnly\s*\n\s*canCreateConsulta/);
    expect(workspaceSrc).not.toMatch(/ProntuarioTab[\s\S]{0,200}readOnly=\{false\}/);
    expect(tabSrc).toContain('createProntuarioConsultaPsiClient');
    expect(tabSrc).toContain('allowCreate');
    expect(tabSrc).toContain('allowDelete');
    expect(tabSrc).toContain("consultaAuthorRole === 'psiquiatra'");
  });

  it('client não grava timeline direto no path Psi', () => {
    const clientSrc = readFileSync(
      join(root, 'lib/metapsi/createProntuarioConsultaPsiClient.ts'),
      'utf8'
    );
    expect(clientSrc).toContain('/api/metapsi/pacientes/');
    expect(clientSrc).toContain('/prontuario');
    expect(clientSrc).not.toContain('addDoc');
    expect(clientSrc).not.toContain('criarEventoProntuario');
  });

  it('helpers: tipos genéricos e snapshot de autoria', () => {
    expect(TIPOS_REGISTRO_CONSULTA_PSI).toContain('consulta');
    expect(TIPOS_REGISTRO_CONSULTA_PSI).toContain('teleconsulta');
    expect(TIPOS_REGISTRO_CONSULTA_PSI).not.toContain('avaliacao_psiquiatrica');
    expect(isTipoRegistroConsultaPsi('consulta')).toBe(true);
    expect(isTipoRegistroConsultaPsi('sessao_psi')).toBe(false);
    expect(montarTituloConsultaPsi('consulta')).toBe('Consulta registrada');
    expect(montarTituloConsultaPsi('consulta')).not.toMatch(/médica/i);
    expect(
      temInformacaoClinicaConsultaPsi({ tipoRegistro: 'consulta', evolucao: 'ok' })
    ).toBe(true);
    expect(temInformacaoClinicaConsultaPsi({ tipoRegistro: 'consulta' })).toBe(false);
    expect(
      montarDescricaoConsultaPsi({
        tipoRegistro: 'consulta',
        evolucao: 'Melhora parcial',
        conduta: 'Manter',
      })
    ).toContain('Evolução: Melhora parcial');
    expect(
      formatPsiquiatraAutorSnapshot({
        nome: 'Ana Souza',
        genero: 'F',
        registroNumero: '12345',
        crmUf: 'SP',
      })
    ).toMatch(/Dra\.\s*Ana Souza/);
    expect(
      formatPsiquiatraAutorSnapshot({
        nome: 'Ana Souza',
        genero: 'F',
        registroNumero: '12345',
        crmUf: 'SP',
      })
    ).toMatch(/CRM SP 12345/);
  });

  it('não cria segundo prontuário psi', () => {
    const serverSrc = readFileSync(
      join(root, 'lib/metapsi/createProntuarioConsultaPsiquiatra.server.ts'),
      'utf8'
    );
    expect(serverSrc).toContain("SUB_TIMELINE = 'timeline'");
    expect(serverSrc).toContain("COL_PACIENTES = 'pacientes_completos'");
    expect(serverSrc).not.toContain('timeline_psiquiatria');
    expect(serverSrc).not.toContain('prontuario_psiquiatria');
    expect(serverSrc).not.toContain('consultas_psiquiatria');
  });
});
