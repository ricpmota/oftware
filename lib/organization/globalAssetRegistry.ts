import type { GlobalAssetModule } from './organizationTypes';

/**
 * Patrimônio Global — pertence à Plataforma Oftware, compartilhado por todas as Organizações.
 * Não recebe organizationId. Ver docs/arquitetura/ETAPA_3_FUNDACAO_ORGANIZACAO.md
 */
export const GLOBAL_ASSET_MODULES: readonly GlobalAssetModule[] = [
  'protocolos',
  'biblioteca_protocolos',
  'prescricoes_sistema',
  'ia',
  'bioimpedancia_referencias',
  'laboratorio_referencias',
  'templates_globais',
  'oftpay',
  'marketplace',
  'conteudo_cientifico',
  'cursos',
  'mentorias',
] as const;

const GLOBAL_ASSET_SET = new Set<string>(GLOBAL_ASSET_MODULES);

/** Indica se um módulo é Patrimônio Global (nunca escopado por organização). */
export function isGlobalAssetModule(module: string): module is GlobalAssetModule {
  return GLOBAL_ASSET_SET.has(module);
}
