export type KnowledgeSurface = 'oftreview' | 'chatnutri' | 'all';

export type KnowledgeManifestEntry = {
  path: string;
  surface: KnowledgeSurface;
  priority: number;
  maxChars?: number;
};

/**
 * Lista explícita (whitelist). Não escaneia pastas — só estes arquivos entram na base.
 * `priority`: menor número = incluído antes no orçamento de caracteres.
 */
export const KNOWLEDGE_MANIFEST: KnowledgeManifestEntry[] = [
  { path: 'docs/00_mapa_mestre_oftware.md', surface: 'all', priority: 1 },
  { path: 'docs/conhecimento/regras_negocio.md', surface: 'all', priority: 2 },
  { path: 'docs/conhecimento/suporte_features_publico.md', surface: 'all', priority: 3, maxChars: 6_000 },
  { path: 'docs/conhecimento/jornada_paciente.md', surface: 'all', priority: 4 },

  { path: 'docs/conhecimento/medico_mente.md', surface: 'oftreview', priority: 10 },
  { path: 'docs/conhecimento/ia_prompt_master_v1.md', surface: 'oftreview', priority: 11, maxChars: 12_000 },
  { path: 'docs/conhecimento/ia_engine_v1.md', surface: 'oftreview', priority: 12, maxChars: 12_000 },

  { path: 'docs/conhecimento/oftware_fluxos_operacionais.md', surface: 'chatnutri', priority: 5, maxChars: 14_000 },
  { path: 'docs/conhecimento/paciente_mente.md', surface: 'chatnutri', priority: 10 },
  { path: 'docs/marketing-diretor/00_LEIA_PRIMEIRO.md', surface: 'chatnutri', priority: 20 },
];
