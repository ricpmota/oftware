'use client';

import { UserRound } from 'lucide-react';
import type { OrganizacaoMensagemPacienteAnexo } from '@/lib/organizacaoMensagem/types';

function formatDataNasc(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return null;
  }
}

type Props = {
  anexo: OrganizacaoMensagemPacienteAnexo;
  onAbrir?: (anexo: OrganizacaoMensagemPacienteAnexo) => void;
  opening?: boolean;
  /** Remetente vê o card sem CTA de abrir (ou com CTA próprio). */
  mode?: 'receber' | 'enviar';
};

export default function MensagemPacienteAnexoCard({
  anexo,
  onAbrir,
  opening,
  mode = 'receber',
}: Props) {
  const nasc = formatDataNasc(anexo.dataNascimento);
  const local =
    [anexo.cidade, anexo.estado].filter(Boolean).join(' / ') || null;
  const meta = [anexo.email, anexo.telefone, nasc ? `Nasc. ${nasc}` : null, local]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white shadow-sm">
      <div className="flex items-start gap-3 p-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white">
          <UserRound className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700">
            Paciente anexado
          </p>
          <p className="truncate text-sm font-semibold text-gray-900">{anexo.nome}</p>
          {meta ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-500">{meta}</p>
          ) : null}
          <p className="mt-1 text-[11px] text-gray-500">
            Prontuário de <span className="font-medium text-gray-700">{anexo.medicoOwnerNome}</span>
            {mode === 'receber' ? ' · acesso compartilhado (não entra na sua lista)' : ''}
          </p>
        </div>
      </div>
      {onAbrir ? (
        <button
          type="button"
          disabled={opening}
          onClick={() => onAbrir(anexo)}
          className="flex w-full items-center justify-center border-t border-teal-100 bg-teal-600/95 px-3 py-2.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {opening ? 'Abrindo…' : 'Abrir prontuário compartilhado'}
        </button>
      ) : null}
    </div>
  );
}
