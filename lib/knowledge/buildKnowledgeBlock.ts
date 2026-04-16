import type { KnowledgeLoadResult } from './knowledgeLoader';

/**
 * Monta o bloco fixo para injeção no system/user prompt.
 */
export function buildKnowledgeBlock(pkg: KnowledgeLoadResult): string {
  const lines: string[] = ['CONHECIMENTO_BASE', ''];

  for (const seg of pkg.segments) {
    lines.push(`[FONTE: ${seg.path}]`, seg.content, '');
  }

  return lines.join('\n').replace(/\n+$/, '');
}
