/**
 * Compatibilidade ETAPA 10: reexporta snapshots versionados.
 * Fonte canônica: `lib/nutri/catalogoOpcao01.ts`
 */

export {
  CATALOGO_OPCAO_01_VERSAO,
  CATALOGO_OPCAO_01_V1 as CATALOGO_OPCAO_01_SNAPSHOT_V1,
  CATALOGO_OPCAO_01_V2 as CATALOGO_OPCAO_01_SNAPSHOT_V2,
  CATALOGO_OPCAO_01_ATUAL,
  IDS_CATALOGO_OPCAO_01_V1,
  IDS_CATALOGO_OPCAO_01_V2,
  obterCatalogoPorVersao,
} from '@/lib/nutri/catalogoOpcao01';
