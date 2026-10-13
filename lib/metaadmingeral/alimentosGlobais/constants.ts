/** Collection top-level da Base Global de Alimentos (Patrimônio Global). */
export const COL_ALIMENTOS_GLOBAIS = 'alimentos_globais';

export const ALIMENTO_GLOBAL_BASE_QUANTIDADE_DEFAULT = 100;
export const ALIMENTO_GLOBAL_BASE_UNIDADE = 'g' as const;

export const STATUS_ALIMENTO_GLOBAL = ['draft', 'review', 'published', 'inactive'] as const;

export type StatusAlimentoGlobal = (typeof STATUS_ALIMENTO_GLOBAL)[number];

export const ROTULO_STATUS_ALIMENTO_GLOBAL: Record<StatusAlimentoGlobal, string> = {
  draft: 'Rascunho',
  review: 'Em revisão',
  published: 'Publicado',
  inactive: 'Inativo',
};

export const ORIGENS_CADASTRO_ALIMENTO_GLOBAL = ['manual', 'pdf_import'] as const;
export type OrigemCadastroAlimentoGlobal = (typeof ORIGENS_CADASTRO_ALIMENTO_GLOBAL)[number];

export function isStatusAlimentoGlobal(value: unknown): value is StatusAlimentoGlobal {
  return typeof value === 'string' && (STATUS_ALIMENTO_GLOBAL as readonly string[]).includes(value);
}
