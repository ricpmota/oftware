/**
 * Trechos oficiais das apostilas Oftreview — fonte do conhecimento para questões.
 * PDFs oficiais: gs://oftware/OFTREVIEW 2023/APOSTILAS/*.pdf
 *
 * Fluxo futuro: Questão → sourceId → Trecho Oficial → Página → PDF Oficial
 */

import { QUESTOES_ADMIN_EMAIL } from '@/types/oftpayQuestoes';

export const SOURCES_ADMIN_EMAIL = QUESTOES_ADMIN_EMAIL;

export const OFTREVIEW_SOURCE_TRECHO_MIN_CHARS = 50;
export const OFTREVIEW_SOURCE_TRECHO_MAX_CHARS = 5000;

export interface OftreviewSource {
  id?: string;
  apostilaTitulo: string;
  pagina?: number;
  /** Referência pedagógica legada; mantida para compatibilidade. */
  tema: string;
  subtema?: string;
  /** Vínculo com oftreviewKnowledgeMap (Mapa das Apostilas). */
  knowledgeMapId?: string;
  /** Capítulo do mapa; referência pedagógica principal quando presente. */
  capituloTitulo?: string;
  trecho: string;
  observacoes?: string;
  criadoPor: string;
  createdAt?: any;
  updatedAt?: any;
}

export type OftreviewSourceDoc = OftreviewSource & { id: string };

export function createEmptyOftreviewSourceDraft(criadoPor: string): OftreviewSource {
  return {
    apostilaTitulo: '',
    tema: '',
    subtema: '',
    trecho: '',
    observacoes: '',
    criadoPor: criadoPor.trim(),
  };
}

/** Capítulo/tema para exibição (prioriza capituloTitulo do mapa). */
export function getSourceCapituloDisplay(
  source: Pick<OftreviewSource, 'capituloTitulo' | 'tema'>
): string {
  const cap = (source.capituloTitulo ?? '').trim();
  return cap || (source.tema ?? '').trim();
}

export function validateOftreviewSource(
  source: Partial<OftreviewSource>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const apostilaTitulo = (source.apostilaTitulo ?? '').trim();
  const tema = (source.tema ?? '').trim();
  const capituloTitulo = (source.capituloTitulo ?? '').trim();
  const trecho = (source.trecho ?? '').trim();

  if (!apostilaTitulo) {
    errors.push('apostilaTitulo é obrigatório.');
  }

  if (!tema && !capituloTitulo) {
    errors.push('tema ou capítulo é obrigatório.');
  }

  if (!trecho) {
    errors.push('trecho é obrigatório.');
  } else {
    const len = [...trecho].length;
    if (len < OFTREVIEW_SOURCE_TRECHO_MIN_CHARS) {
      errors.push(`trecho deve ter no mínimo ${OFTREVIEW_SOURCE_TRECHO_MIN_CHARS} caracteres.`);
    }
    if (len > OFTREVIEW_SOURCE_TRECHO_MAX_CHARS) {
      errors.push(`trecho deve ter no máximo ${OFTREVIEW_SOURCE_TRECHO_MAX_CHARS} caracteres.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Prévia curta para listagens. */
export function previewTrecho(trecho: string, maxLen = 120): string {
  const t = trecho.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
}
