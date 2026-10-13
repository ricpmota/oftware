'use client';

import { useEffect, useState } from 'react';
import { Brain } from 'lucide-react';
import {
  formatPsiquiatraResponsavelTitulo,
  resolvePsiquiatraResponsavelAtivo,
  type PsiquiatraResponsavelView,
} from '@/lib/psiquiatria/resolvePsiquiatraResponsavel';

/**
 * Contrato explícito de permissão da área clínica Psiquiatria.
 * - owner: profissional proprietário (/metapsi) — preparado para edição na ETAPA 7
 * - readonly: demais portais — somente visualização
 *
 * ETAPA 5: nenhum dos modos persiste dados clínicos.
 */
export type PsiquiatriaContentMode = 'owner' | 'readonly';

export type PsiquiatriaContentProps = {
  pacienteId: string;
  mode: PsiquiatriaContentMode;
  className?: string;
  /**
   * Se true (padrão), exibe header do Psiquiatra responsável quando houver ACL ativa.
   * Não mostra painel de compartilhamento (isso fica no /metaadmin).
   */
  showResponsavelHeader?: boolean;
};

/**
 * Área clínica compartilhada Psiquiatria (metaadmin / metanutri / metapsi / metapersonal).
 * Sem anamnese, evolução, escalas ou prescrição nesta etapa.
 * Montagem NÃO cria documentos Firestore clínicos.
 */
export default function PsiquiatriaContent({
  pacienteId,
  mode,
  className = '',
  showResponsavelHeader = true,
}: PsiquiatriaContentProps) {
  const [loading, setLoading] = useState(true);
  const [responsavel, setResponsavel] = useState<PsiquiatraResponsavelView | null>(null);

  // Preparado para ETAPA 7 — hoje não há mutações clínicas.
  const canEdit = mode === 'owner';
  void canEdit;

  useEffect(() => {
    let cancelado = false;
    const pid = String(pacienteId || '').trim();
    if (!pid) {
      setResponsavel(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    void (async () => {
      try {
        const view = await resolvePsiquiatraResponsavelAtivo(pid);
        if (!cancelado) setResponsavel(view);
      } catch (e) {
        console.error('[PsiquiatriaContent] falha ao resolver responsável:', e);
        if (!cancelado) setResponsavel(null);
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [pacienteId]);

  if (loading) {
    return (
      <div className={`flex min-h-[12rem] items-center justify-center ${className}`}>
        <p className="text-sm text-gray-500">Carregando Psiquiatria…</p>
      </div>
    );
  }

  // Viewers sem ACL Psi ativa: acompanhamento inexistente (sem CTA de share).
  if (!responsavel && mode === 'readonly') {
    return (
      <div
        className={`flex min-h-[16rem] flex-col items-center justify-center rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/60 to-white px-6 py-10 text-center ${className}`}
        data-psiquiatria-mode={mode}
        data-psiquiatria-persist="false"
      >
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
          <Brain className="h-6 w-6" aria-hidden />
        </span>
        <h3 className="text-lg font-semibold text-gray-900">Psiquiatria</h3>
        <p className="mt-3 text-sm font-medium text-indigo-800">
          Nenhum acompanhamento psiquiátrico ativo.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`space-y-4 ${className}`}
      data-psiquiatria-mode={mode}
      data-psiquiatria-persist="false"
      data-psiquiatria-can-edit={canEdit ? 'true' : 'false'}
    >
      {showResponsavelHeader && responsavel ? (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700/80">
            Psiquiatra responsável
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            {formatPsiquiatraResponsavelTitulo(responsavel)}
          </p>
          <p className="mt-0.5 text-xs text-gray-600">
            CRM {responsavel.crmLabel}
            {responsavel.rqe ? ` · RQE ${responsavel.rqe}` : ''}
          </p>
        </div>
      ) : null}

      <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/80 to-white px-6 py-10 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
          <Brain className="h-7 w-7" aria-hidden />
        </span>
        <h3 className="text-lg font-semibold text-gray-900">Psiquiatria</h3>
        <p className="mt-2 max-w-md text-sm text-gray-600">
          Área de acompanhamento psiquiátrico para avaliação, acompanhamento e evolução do paciente.
        </p>
        <p className="mt-4 text-sm font-medium text-indigo-800">
          Nenhum registro psiquiátrico realizado.
        </p>
      </div>
    </div>
  );
}
