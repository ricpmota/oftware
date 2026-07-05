/**
 * Mapa de conhecimento das apostilas Oftreview.
 * Catálogo manual de temas — fonte futura para geração de questões.
 * PDFs oficiais: gs://oftware/OFTREVIEW 2023/APOSTILAS/*.pdf
 */

import { QUESTOES_ADMIN_EMAIL } from '@/types/oftpayQuestoes';

/** Mesmo administrador do banco de questões. */
export const KNOWLEDGE_MAP_ADMIN_EMAIL = QUESTOES_ADMIN_EMAIL;

export interface OftreviewKnowledgeMapCapitulo {
  titulo: string;
  subtemas: string[];
}

export interface OftreviewKnowledgeMap {
  id?: string;
  apostilaTitulo: string;
  categoria?: string;
  capitulos: OftreviewKnowledgeMapCapitulo[];
  criadoPor: string;
  createdAt?: any;
  updatedAt?: any;
}

export type OftreviewKnowledgeMapDoc = OftreviewKnowledgeMap & { id: string };

/** Aba extra na página /oftpay/questoes (somente admin). */
export type OftpayQuestoesPageTab = 'aluno' | 'criador' | 'mapa';

export function createEmptyKnowledgeMapDraft(criadoPor: string): OftreviewKnowledgeMap {
  return {
    apostilaTitulo: '',
    categoria: '',
    capitulos: [{ titulo: '', subtemas: [''] }],
    criadoPor: criadoPor.trim(),
  };
}

export function validateKnowledgeMap(
  map: Partial<OftreviewKnowledgeMap>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const titulo = (map.apostilaTitulo ?? '').trim();

  if (!titulo) {
    errors.push('apostilaTitulo é obrigatório.');
  }

  const capitulos = map.capitulos ?? [];
  if (capitulos.length === 0) {
    errors.push('informe ao menos um capítulo.');
  }

  capitulos.forEach((cap, index) => {
    if (!(cap.titulo ?? '').trim()) {
      errors.push(`capítulo ${index + 1}: titulo é obrigatório.`);
    }
    if (!Array.isArray(cap.subtemas)) {
      errors.push(`capítulo ${index + 1}: subtemas deve ser uma lista.`);
    }
  });

  return { valid: errors.length === 0, errors };
}

export function normalizeKnowledgeMapCapitulos(
  capitulos: OftreviewKnowledgeMapCapitulo[]
): OftreviewKnowledgeMapCapitulo[] {
  return capitulos.map((cap) => ({
    titulo: cap.titulo.trim(),
    subtemas: cap.subtemas.map((s) => s.trim()).filter(Boolean),
  }));
}
