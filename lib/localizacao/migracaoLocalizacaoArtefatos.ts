import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const MIGRATION_ID = 'LOCALIZACAO_ETAPA_7';
export const DRY_RUN_REPORT_NAME = 'etapa7-dry-run.json';

const CHAVES_PROIBIDAS = new Set([
  'nome',
  'cpf',
  'telefone',
  'email',
  'rua',
  'cep',
  'complemento',
  'bairro',
  'numero',
  'número',
]);

export type CamposLocalizacaoRollback = {
  estado: string;
  cidade: string;
  codigoIbge: string;
};

export type RegistroRollbackLocalizacao = {
  documentId: string;
  before: CamposLocalizacaoRollback;
  after: CamposLocalizacaoRollback;
};

export type ResultadoMigracaoDocumento =
  | {
      status: 'updated';
      documentId: string;
      before: CamposLocalizacaoRollback;
      after: CamposLocalizacaoRollback;
    }
  | { status: 'skippedBecauseChanged'; documentId: string }
  | { status: 'failed'; documentId: string; motivo: string };

export type ArtefatoRollbackLocalizacao = {
  migration: typeof MIGRATION_ID;
  executedAt: string;
  collection: 'pacientes_completos';
  attempted: number;
  updated: number;
  skippedBecauseChanged: number;
  failed: number;
  records: RegistroRollbackLocalizacao[];
};

export type ArtefatoFalhasLocalizacao = {
  migration: typeof MIGRATION_ID;
  executedAt: string;
  collection: 'pacientes_completos';
  failed: number;
  falhas: Array<{ documentId: string; motivo: string }>;
};

function campos(valor: CamposLocalizacaoRollback): CamposLocalizacaoRollback {
  return {
    estado: valor.estado,
    cidade: valor.cidade,
    codigoIbge: valor.codigoIbge,
  };
}

/** Copia só os três campos. Qualquer outro dado do documento fica de fora. */
export function registroDeAtualizacao(entrada: {
  documentId: string;
  before: CamposLocalizacaoRollback;
  after: CamposLocalizacaoRollback;
}): RegistroRollbackLocalizacao {
  return {
    documentId: entrada.documentId,
    before: campos(entrada.before),
    after: campos(entrada.after),
  };
}

export function montarArtefatoRollback(
  executedAt: string,
  resultados: ResultadoMigracaoDocumento[]
): ArtefatoRollbackLocalizacao {
  const records = resultados.flatMap((item) =>
    item.status === 'updated' ? [registroDeAtualizacao(item)] : []
  );
  return {
    migration: MIGRATION_ID,
    executedAt,
    collection: 'pacientes_completos',
    attempted: resultados.length,
    updated: records.length,
    skippedBecauseChanged: resultados.filter((item) => item.status === 'skippedBecauseChanged').length,
    failed: resultados.filter((item) => item.status === 'failed').length,
    records,
  };
}

export function montarArtefatoFalhas(
  executedAt: string,
  resultados: ResultadoMigracaoDocumento[]
): ArtefatoFalhasLocalizacao {
  const falhas = resultados.flatMap((item) =>
    item.status === 'failed' ? [{ documentId: item.documentId, motivo: item.motivo }] : []
  );
  return {
    migration: MIGRATION_ID,
    executedAt,
    collection: 'pacientes_completos',
    failed: falhas.length,
    falhas,
  };
}

export function assertArtefatoSemDadosPessoais(valor: unknown): void {
  const pilha = [valor];
  while (pilha.length > 0) {
    const atual = pilha.pop();
    if (!atual || typeof atual !== 'object') continue;
    for (const [chave, filho] of Object.entries(atual)) {
      if (CHAVES_PROIBIDAS.has(chave.toLowerCase())) {
        throw new Error(`O artefato de migração não pode conter ${chave}.`);
      }
      pilha.push(filho);
    }
  }
}

/** 2026-09-29T091530 — sem dois-pontos, seguro como nome de arquivo. */
export function stampParaNome(date: Date): string {
  const ano = date.getUTCFullYear();
  const mes = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(date.getUTCDate()).padStart(2, '0');
  const hora = String(date.getUTCHours()).padStart(2, '0');
  const minuto = String(date.getUTCMinutes()).padStart(2, '0');
  const segundo = String(date.getUTCSeconds()).padStart(2, '0');
  return `${ano}-${mes}-${dia}T${hora}${minuto}${segundo}`;
}

export function nomeArtefatoMigracao(date: Date, executionId: string, tipo: 'rollback' | 'falhas'): string {
  const id = executionId.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!id) throw new Error('A execução precisa de um identificador.');
  return `${stampParaNome(date)}-${id}-localizacao-etapa7-${tipo}.json`;
}

function nomesDisponiveis(fileName: string): string[] {
  const ponto = fileName.lastIndexOf('.');
  const base = fileName.slice(0, ponto);
  const ext = fileName.slice(ponto);
  const nomes = [fileName];
  for (let indice = 2; indice < 1000; indice += 1) nomes.push(`${base}-${indice}${ext}`);
  return nomes;
}

/** Grava com flag exclusiva. Se o nome já existe, escolhe outro e não substitui o anterior. */
export function escreverArquivoNovo(dir: string, fileName: string, contents: string): string {
  mkdirSync(dir, { recursive: true });
  for (const nome of nomesDisponiveis(fileName)) {
    const caminho = join(dir, nome);
    try {
      writeFileSync(caminho, contents, { flag: 'wx' });
      return caminho;
    } catch (error) {
      const codigo = (error as NodeJS.ErrnoException).code;
      if (codigo !== 'EEXIST') throw error;
    }
  }
  throw new Error('Não foi possível gravar o artefato sem sobrescrever.');
}

/** Dry-run grava só o relatório agregado. Não cria nem altera rollback. */
export function gravarRelatorioDryRun(dir: string, relatorio: unknown): string {
  mkdirSync(dir, { recursive: true });
  const caminho = join(dir, DRY_RUN_REPORT_NAME);
  writeFileSync(caminho, JSON.stringify(relatorio, null, 2));
  return caminho;
}

export function gravarArtefatosApply(input: {
  dir: string;
  executedAt: Date;
  executionId: string;
  resultados: ResultadoMigracaoDocumento[];
}): { rollbackPath: string; falhasPath: string } {
  const iso = input.executedAt.toISOString();
  const rollback = montarArtefatoRollback(iso, input.resultados);
  const falhas = montarArtefatoFalhas(iso, input.resultados);
  assertArtefatoSemDadosPessoais(rollback);
  assertArtefatoSemDadosPessoais(falhas);
  const rollbackPath = escreverArquivoNovo(
    input.dir,
    nomeArtefatoMigracao(input.executedAt, input.executionId, 'rollback'),
    JSON.stringify(rollback, null, 2)
  );
  const falhasPath = escreverArquivoNovo(
    input.dir,
    nomeArtefatoMigracao(input.executedAt, input.executionId, 'falhas'),
    JSON.stringify(falhas, null, 2)
  );
  return { rollbackPath, falhasPath };
}
