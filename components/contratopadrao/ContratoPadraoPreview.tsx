'use client';

import { useMemo } from 'react';
import { fillContratoTirzepatidaTemplate } from '@/lib/contratos/contratoTirzepatidaTemplate';
import {
  CONTRATO_PADRAO_PREVIEW_MEDICO_HEADER,
  CONTRATO_PADRAO_PREVIEW_PLACEHOLDERS,
} from '@/lib/contratos/contratoPadraoPreviewSample';
import {
  paginateContratoPreviewTexto,
  previewLineClassName,
} from '@/lib/contratos/contratoPadraoPreviewPaginate';
import { Eye } from 'lucide-react';

type ContratoPadraoPreviewProps = {
  template: string;
};

function SignatureReserveFooter() {
  return (
    <div className="mt-6 border-t border-dashed border-gray-300 pt-4 space-y-3">
      <p className="text-[8pt] font-semibold uppercase tracking-wide text-gray-500">
        Espaço reservado na última página — assinaturas digitais
      </p>
      <div className="rounded-lg border-2 border-dashed border-amber-300/80 bg-amber-50/60 px-4 py-4">
        <p className="text-[9pt] font-semibold text-amber-900/80">Assinatura do paciente</p>
        <p className="mt-1 text-[8pt] text-amber-900/70">BRy EasySign</p>
      </div>
      <div className="rounded-lg border-2 border-dashed border-blue-300/80 bg-blue-50/60 px-4 py-4">
        <p className="text-[9pt] font-semibold text-blue-900/80">Assinatura do médico</p>
        <p className="mt-1 text-[8pt] text-blue-900/70">ICP-Brasil</p>
      </div>
    </div>
  );
}

export default function ContratoPadraoPreview({ template }: ContratoPadraoPreviewProps) {
  const pages = useMemo(() => {
    const filled = fillContratoTirzepatidaTemplate(
      CONTRATO_PADRAO_PREVIEW_PLACEHOLDERS,
      template
    );
    return paginateContratoPreviewTexto(filled);
  }, [template]);

  const totalPages = pages.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-gray-500" aria-hidden />
          <h2 className="text-sm font-semibold text-gray-800">Preview do contrato</h2>
        </div>
        <p className="text-xs text-gray-500">
          Dados simulados: {CONTRATO_PADRAO_PREVIEW_PLACEHOLDERS.nomeMedico} ×{' '}
          {CONTRATO_PADRAO_PREVIEW_PLACEHOLDERS.nomePaciente} · {totalPages}{' '}
          {totalPages === 1 ? 'página' : 'páginas'}
        </p>
      </div>

      <p className="text-xs text-gray-500">
        Páginas intermediárias usam a área útil completa. A faixa de assinaturas aparece apenas
        no rodapé da última página.
      </p>

      <div className="space-y-6 rounded-xl border border-gray-200 bg-gray-100/80 p-4 sm:p-6">
        {pages.map((page) => {
          const isLastPage = page.pageNumber === totalPages;
          return (
            <article
              key={page.pageNumber}
              className="mx-auto w-full max-w-[210mm] bg-white shadow-md ring-1 ring-gray-200"
            >
              <div className="px-[18mm] pt-[14mm] pb-[10mm]">
                {page.pageNumber === 1 && (
                  <header className="mb-4 border-b border-gray-200 pb-3">
                    <p className="text-[14pt] font-bold text-[#1e2a3a]">
                      {CONTRATO_PADRAO_PREVIEW_MEDICO_HEADER.nome}
                    </p>
                    <p className="text-[8.5pt] text-[#5a5a5a]">
                      {CONTRATO_PADRAO_PREVIEW_MEDICO_HEADER.crm}
                    </p>
                    <p className="text-[8pt] text-[#5a5a5a]">
                      {CONTRATO_PADRAO_PREVIEW_MEDICO_HEADER.email}
                    </p>
                  </header>
                )}

                <div>
                  {page.blocks.map((block, idx) => (
                    <p key={idx} className={previewLineClassName(block.line.kind)}>
                      {block.line.text}
                    </p>
                  ))}
                </div>

                {isLastPage ? <SignatureReserveFooter /> : null}
              </div>

              <footer className="border-t border-gray-100 px-[18mm] py-2 text-center text-[7pt] text-[#5a5a5a]">
                Contrato de Tratamento — {CONTRATO_PADRAO_PREVIEW_MEDICO_HEADER.nome} —{' '}
                {CONTRATO_PADRAO_PREVIEW_MEDICO_HEADER.crm} — Página {page.pageNumber}/
                {totalPages}
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}
