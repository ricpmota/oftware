import { mkdtempSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  gravarArtefatosApply,
  gravarRelatorioDryRun,
  montarArtefatoRollback,
  nomeArtefatoMigracao,
  type CamposLocalizacaoRollback,
  type ResultadoMigracaoDocumento,
} from '@/lib/localizacao/migracaoLocalizacaoArtefatos';

const quando = new Date('2026-09-29T09:15:30.000Z');

function pasta(): string {
  return mkdtempSync(join(tmpdir(), 'oftware-etapa7-'));
}

function resultadosMistos(): ResultadoMigracaoDocumento[] {
  return [
    {
      status: 'updated',
      documentId: 'doc-atualizado',
      before: { estado: 'PB', cidade: 'Joao Pessoa', codigoIbge: '' },
      after: { estado: 'PB', cidade: 'João Pessoa', codigoIbge: '2507507' },
    },
    { status: 'skippedBecauseChanged', documentId: 'doc-pulado' },
    { status: 'failed', documentId: 'doc-falhou', motivo: 'timeout' },
  ];
}

describe('artefatos da migração de localização', () => {
  it('dry-run grava só o relatório e não cria rollback', () => {
    const dir = pasta();
    gravarRelatorioDryRun(dir, { eligible: 0, writes: 0 });
    expect(readdirSync(dir)).toEqual(['etapa7-dry-run.json']);
  });

  it('dry-run posterior não modifica rollback existente', () => {
    const dir = pasta();
    const rollback = join(dir, '2026-09-29T091200-aaaa-localizacao-etapa7-rollback.json');
    writeFileSync(rollback, '{"records":[1]}');
    const antes = { conteudo: readFileSync(rollback, 'utf8'), mtime: statSync(rollback).mtimeMs };

    gravarRelatorioDryRun(dir, { eligible: 0 });

    expect(readFileSync(rollback, 'utf8')).toBe(antes.conteudo);
    expect(statSync(rollback).mtimeMs).toBe(antes.mtime);
    expect(readdirSync(dir).sort()).toEqual([
      '2026-09-29T091200-aaaa-localizacao-etapa7-rollback.json',
      'etapa7-dry-run.json',
    ]);
  });

  it('apply gera arquivo próprio de rollback', () => {
    const dir = pasta();
    const { rollbackPath } = gravarArtefatosApply({
      dir,
      executedAt: quando,
      executionId: 'ab12cd34',
      resultados: resultadosMistos().filter((item) => item.status === 'updated'),
    });
    expect(rollbackPath).toBe(join(dir, nomeArtefatoMigracao(quando, 'ab12cd34', 'rollback')));
    const artefato = JSON.parse(readFileSync(rollbackPath, 'utf8'));
    expect(artefato.migration).toBe('LOCALIZACAO_ETAPA_7');
    expect(artefato.collection).toBe('pacientes_completos');
    expect(artefato.records).toHaveLength(1);
  });

  it('segundo apply gera outro arquivo e preserva o primeiro', () => {
    const dir = pasta();
    const primeiro = gravarArtefatosApply({
      dir,
      executedAt: quando,
      executionId: 'aaaa1111',
      resultados: resultadosMistos().filter((item) => item.status === 'updated'),
    });
    const conteudo = readFileSync(primeiro.rollbackPath, 'utf8');
    const segundo = gravarArtefatosApply({
      dir,
      executedAt: quando,
      executionId: 'bbbb2222',
      resultados: [],
    });
    expect(segundo.rollbackPath).not.toBe(primeiro.rollbackPath);
    expect(readFileSync(primeiro.rollbackPath, 'utf8')).toBe(conteudo);
    expect(JSON.parse(readFileSync(segundo.rollbackPath, 'utf8')).records).toEqual([]);
  });

  it('nome idêntico não sobrescreve o arquivo já gravado', () => {
    const dir = pasta();
    const nome = nomeArtefatoMigracao(quando, 'cccc3333', 'rollback');
    writeFileSync(join(dir, nome), '{"original":true}');
    const gravado = gravarArtefatosApply({
      dir,
      executedAt: quando,
      executionId: 'cccc3333',
      resultados: [],
    });
    expect(readFileSync(join(dir, nome), 'utf8')).toBe('{"original":true}');
    expect(gravado.rollbackPath).not.toBe(join(dir, nome));
    expect(gravado.rollbackPath.endsWith('-2.json')).toBe(true);
  });

  it('records traz só documentos atualizados', () => {
    const artefato = montarArtefatoRollback(quando.toISOString(), resultadosMistos());
    expect(artefato.attempted).toBe(3);
    expect(artefato.updated).toBe(1);
    expect(artefato.skippedBecauseChanged).toBe(1);
    expect(artefato.failed).toBe(1);
    expect(artefato.records).toEqual([
      {
        documentId: 'doc-atualizado',
        before: { estado: 'PB', cidade: 'Joao Pessoa', codigoIbge: '' },
        after: { estado: 'PB', cidade: 'João Pessoa', codigoIbge: '2507507' },
      },
    ]);
    expect(JSON.stringify(artefato.records)).not.toContain('doc-pulado');
    expect(JSON.stringify(artefato.records)).not.toContain('doc-falhou');
  });

  it('não copia dados pessoais para o rollback', () => {
    const before = {
      estado: 'PB',
      cidade: 'João Pessoa',
      codigoIbge: '',
      nome: 'nao entra',
      cpf: '000',
      telefone: '83',
      email: 'a@b.c',
      rua: 'Rua 1',
      cep: '58000-000',
    };
    const artefato = montarArtefatoRollback(quando.toISOString(), [
      {
        status: 'updated',
        documentId: 'doc-1',
        before: before as CamposLocalizacaoRollback,
        after: { estado: 'PB', cidade: 'João Pessoa', codigoIbge: '2507507' },
      },
    ]);
    const texto = JSON.stringify(artefato);
    for (const chave of ['nome', 'cpf', 'telefone', 'email', 'rua', 'cep']) {
      expect(texto).not.toContain(chave);
    }
    expect(artefato.records[0].before).toEqual({ estado: 'PB', cidade: 'João Pessoa', codigoIbge: '' });
  });

  it('arquivo de falhas é da execução e não mistura skip', () => {
    const dir = pasta();
    const { falhasPath, rollbackPath } = gravarArtefatosApply({
      dir,
      executedAt: quando,
      executionId: 'falha01',
      resultados: resultadosMistos(),
    });
    expect(falhasPath).not.toBe(rollbackPath);
    expect(falhasPath).toContain('falha01-localizacao-etapa7-falhas.json');
    const falhas = JSON.parse(readFileSync(falhasPath, 'utf8'));
    expect(falhas.failed).toBe(1);
    expect(falhas.falhas).toEqual([{ documentId: 'doc-falhou', motivo: 'timeout' }]);
  });
});
