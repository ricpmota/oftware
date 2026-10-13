/**
 * Catálogo leve de questões publicadas (sem enunciado/alternativas/explicação).
 * Usado para montar simulados, índices e cobertura — ~10–50× menor que docs completos.
 */

import type { QuestaoDificuldade } from '@/types/oftpayQuestoes';
import type { OftpayQuestaoDoc } from '@/services/oftpayQuestoesService';

/** Campos mínimos para filtrar, contar e montar questionIds. */
export type OftpayQuestaoCatalogItem = {
  id: string;
  tema: string;
  subtema?: string;
  capituloTitulo?: string;
  dificuldade: QuestaoDificuldade;
  fonte: { apostilaTitulo: string };
  createdAt?: number;
};

/** Aceita doc completo ou item de catálogo nas funções de match/contagem. */
export type OftpayQuestaoMatchable = OftpayQuestaoCatalogItem | OftpayQuestaoDoc;

export function isFullQuestaoDoc(q: OftpayQuestaoMatchable): q is OftpayQuestaoDoc {
  return 'enunciado' in q && typeof (q as OftpayQuestaoDoc).enunciado === 'string';
}
