import { findMunicipalityByIbgeCode } from '@/lib/localizacao/brazilLocations';
import {
  categoriaEhCandidataAutomatica,
  classifyPatientLocation,
  type PatientLocationCategory,
  type PatientLocationInputFields,
  type PatientLocationProposal,
} from '@/lib/localizacao/classifyPatientLocation';

/** Confirmação exigida junto de --apply. --apply sozinho não escreve. */
export const MIGRACAO_CONFIRM_TOKEN = 'LOCALIZACAO_ETAPA_7';

export const PATH_ESTADO = 'dadosIdentificacao.endereco.estado';
export const PATH_CIDADE = 'dadosIdentificacao.endereco.cidade';
export const PATH_CODIGO_IBGE = 'dadosIdentificacao.endereco.codigoIbge';

export const LOCATION_MIGRATION_UPDATE_PATHS = [PATH_ESTADO, PATH_CIDADE, PATH_CODIGO_IBGE] as const;

export type LocationMigrationUpdate = {
  [PATH_ESTADO]: string;
  [PATH_CIDADE]: string;
  [PATH_CODIGO_IBGE]: string;
};

export type ModoMigracaoLocalizacao =
  | { modo: 'dry-run' }
  | { modo: 'apply'; confirm: typeof MIGRACAO_CONFIRM_TOKEN };

export type DecisaoMigracaoLocalizacao =
  | {
      acao: 'atualizar';
      categoria: 'B_RESOLVIVEL_SEM_CODIGO' | 'C_RESOLVIVEL_NORMALIZACAO';
      proposta: PatientLocationProposal;
      anterior: { estado: string; cidade: string; codigoIbge: string };
      update: LocationMigrationUpdate;
    }
  | {
      acao: 'ignorar';
      categoria: PatientLocationCategory;
      motivo: string;
    };

function texto(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Sem --apply o modo é dry-run, inclusive quando nenhum argumento é passado.
 * --apply sem o token exato é recusado antes de qualquer cliente Firestore.
 */
export function interpretarArgumentosMigracao(argv: string[]): ModoMigracaoLocalizacao {
  for (const arg of argv) {
    if (arg === '--dry-run' || arg === '--apply' || arg.startsWith('--confirm=')) continue;
    throw new Error(`Argumento não reconhecido: ${arg}`);
  }

  const apply = argv.includes('--apply');
  const dryRun = argv.includes('--dry-run');
  if (apply && dryRun) {
    throw new Error('Informe apenas um modo: --dry-run ou --apply.');
  }
  if (!apply) return { modo: 'dry-run' };

  const confirmArg = argv.find((arg) => arg.startsWith('--confirm='));
  const token = confirmArg ? confirmArg.slice('--confirm='.length) : '';
  if (token !== MIGRACAO_CONFIRM_TOKEN) {
    throw new Error(
      'Escrita recusada. --apply sozinho não altera pacientes. Use --apply --confirm=LOCALIZACAO_ETAPA_7.'
    );
  }
  return { modo: 'apply', confirm: MIGRACAO_CONFIRM_TOKEN };
}

export function extrairCamposEndereco(data: Record<string, unknown> | undefined): PatientLocationInputFields {
  const identificacao = data?.dadosIdentificacao;
  const endereco =
    identificacao && typeof identificacao === 'object'
      ? (identificacao as { endereco?: unknown }).endereco
      : undefined;
  const mapa = endereco && typeof endereco === 'object' ? (endereco as Record<string, unknown>) : {};
  return {
    estado: texto(mapa.estado),
    cidade: texto(mapa.cidade),
    codigoIbge: texto(mapa.codigoIbge),
  };
}

export function propostaEhCanonica(proposta: PatientLocationProposal): boolean {
  if (!/^\d{7}$/.test(proposta.codigoIbge)) return false;
  const municipio = findMunicipalityByIbgeCode(proposta.codigoIbge);
  return municipio !== null && municipio.uf === proposta.estado && municipio.nome === proposta.cidade;
}

/**
 * Decide a escrita a partir do documento lido agora.
 * Chame de novo dentro da transaction: se o documento deixou de ser B ou C, o retorno é ignorar.
 */
export function decidirMigracaoLocalizacao(input?: PatientLocationInputFields | null): DecisaoMigracaoLocalizacao {
  const campos = {
    estado: texto(input?.estado),
    cidade: texto(input?.cidade),
    codigoIbge: texto(input?.codigoIbge),
  };
  const classified = classifyPatientLocation(campos);

  if (!categoriaEhCandidataAutomatica(classified.categoria) || !classified.proposta) {
    return {
      acao: 'ignorar',
      categoria: classified.categoria,
      motivo: classified.categoria,
    };
  }

  if (!propostaEhCanonica(classified.proposta)) {
    return {
      acao: 'ignorar',
      categoria: classified.categoria,
      motivo: 'proposta_nao_canonica',
    };
  }

  const update: LocationMigrationUpdate = {
    [PATH_ESTADO]: classified.proposta.estado,
    [PATH_CIDADE]: classified.proposta.cidade,
    [PATH_CODIGO_IBGE]: classified.proposta.codigoIbge,
  };

  return {
    acao: 'atualizar',
    categoria: classified.categoria,
    proposta: classified.proposta,
    anterior: campos,
    update,
  };
}

function definirCaminho(alvo: Record<string, unknown>, path: string, value: string) {
  const partes = path.split('.');
  let cursor = alvo;
  for (let index = 0; index < partes.length - 1; index += 1) {
    const chave = partes[index];
    const proximo = cursor[chave];
    if (!proximo || typeof proximo !== 'object' || Array.isArray(proximo)) {
      const criado: Record<string, unknown> = {};
      cursor[chave] = criado;
      cursor = criado;
    } else {
      cursor = proximo as Record<string, unknown>;
    }
  }
  cursor[partes[partes.length - 1]] = value;
}

/** Aplica só os três paths. Qualquer outra chave é erro. */
export function aplicarPatchLocalizacao<T extends Record<string, unknown>>(
  documento: T,
  update: LocationMigrationUpdate
): T {
  const chaves = Object.keys(update);
  if (chaves.length !== LOCATION_MIGRATION_UPDATE_PATHS.length) {
    throw new Error('O patch da migração precisa ter exatamente três paths.');
  }
  for (const chave of chaves) {
    if (!LOCATION_MIGRATION_UPDATE_PATHS.includes(chave as (typeof LOCATION_MIGRATION_UPDATE_PATHS)[number])) {
      throw new Error(`Path fora da migração: ${chave}`);
    }
  }

  const clone = structuredClone(documento);
  for (const path of LOCATION_MIGRATION_UPDATE_PATHS) {
    definirCaminho(clone, path, update[path]);
  }
  return clone;
}
