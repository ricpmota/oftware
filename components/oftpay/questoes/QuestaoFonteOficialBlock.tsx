'use client';

import { useState } from 'react';
import {
  getQuestaoCapituloDisplay,
  type OftpayQuestao,
} from '@/types/oftpayQuestoes';
import type { OftpayQuestaoDoc } from '@/services/oftpayQuestoesService';
import { BookOpen, ChevronDown, ChevronRight, ExternalLink, X } from 'lucide-react';

const OFTREVIEW_COURSE_ID = 'oftreview';

export function hasQuestaoFonteOficial(
  questao: Pick<OftpayQuestao, 'sourceId' | 'fonte'>
): boolean {
  return Boolean(
    questao.sourceId?.trim() ||
      questao.fonte?.apostilaTitulo?.trim() ||
      questao.fonte?.trechoBase?.trim()
  );
}

/** Mesma estratégia do chat: redirect via apostila-signed-url. */
export function buildApostilaSignedUrl(
  apostilaTitulo: string,
  courseId = OFTREVIEW_COURSE_ID
): string {
  const title = apostilaTitulo.replace(/\.(cdr|pdf)$/i, '').trim();
  return `/api/oftpay/apostila-signed-url?title=${encodeURIComponent(title)}&courseId=${encodeURIComponent(courseId)}`;
}

interface QuestaoFonteOficialBlockProps {
  questao: OftpayQuestaoDoc;
  /** Bloco principal aberto por padrão (ex.: modal admin). */
  defaultExpanded?: boolean;
  /** Trecho oficial aberto por padrão. */
  defaultTrechoOpen?: boolean;
}

export default function QuestaoFonteOficialBlock({
  questao,
  defaultExpanded = false,
  defaultTrechoOpen = false,
}: QuestaoFonteOficialBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [trechoOpen, setTrechoOpen] = useState(defaultTrechoOpen);

  if (!hasQuestaoFonteOficial(questao)) return null;

  const capitulo = getQuestaoCapituloDisplay(questao);
  const subtema = questao.subtema?.trim();
  const apostila = questao.fonte.apostilaTitulo?.trim();
  const pagina = questao.fonte.pagina;
  const trecho = questao.fonte.trechoBase?.trim();
  const canOpenApostila = Boolean(apostila);

  return (
    <div className="rounded-lg border border-blue-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50/80 text-left text-sm font-medium text-blue-900 hover:bg-blue-50"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
        )}
        <BookOpen className="w-4 h-4 flex-shrink-0" />
        Fonte Oficial
      </button>

      {expanded && (
        <div className="px-3 py-3 text-sm space-y-2 bg-white border-t border-blue-100">
          <p>
            <span className="text-gray-500">Capítulo:</span>{' '}
            {capitulo || '—'}
          </p>
          <p>
            <span className="text-gray-500">Subtema:</span> {subtema || '—'}
          </p>
          <p>
            <span className="text-gray-500">Apostila:</span> {apostila || '—'}
          </p>
          <p>
            <span className="text-gray-500">Página:</span> {pagina ?? '—'}
          </p>

          {trecho && (
            <div className="rounded-lg border border-gray-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setTrechoOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-2.5 py-2 bg-gray-50 text-left text-xs font-medium text-gray-700 hover:bg-gray-100"
                aria-expanded={trechoOpen}
              >
                {trechoOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                Trecho Oficial
              </button>
              {trechoOpen && (
                <p className="text-gray-800 whitespace-pre-wrap text-xs leading-relaxed px-2.5 py-2 border-t border-gray-100">
                  {trecho}
                </p>
              )}
            </div>
          )}

          {canOpenApostila && (
            <a
              href={buildApostilaSignedUrl(apostila!)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100 mt-1"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir Apostila
            </a>
          )}
        </div>
      )}
    </div>
  );
}

interface QuestaoFonteOficialModalProps {
  questao: OftpayQuestaoDoc;
  onClose: () => void;
}

export function QuestaoFonteOficialModal({ questao, onClose }: QuestaoFonteOficialModalProps) {
  if (!hasQuestaoFonteOficial(questao)) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-medium text-gray-900">Fonte Oficial</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Rastreabilidade: apostila → trecho → questão
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-500 hover:bg-gray-100"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <QuestaoFonteOficialBlock
          questao={questao}
          defaultExpanded
          defaultTrechoOpen
        />
      </div>
    </div>
  );
}
