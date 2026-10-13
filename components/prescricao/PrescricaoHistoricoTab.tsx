'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, FileText, Loader2, Pencil, Pill, Receipt } from 'lucide-react';
import type { Prescricao } from '@/types/prescricao';
import { PrescricaoService } from '@/services/prescricaoService';

function formatarDataHora(d: Date): string {
  try {
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '';
  }
}

export type PrescricaoHistoricoTabProps = {
  pacienteId: string | null | undefined;
  accent?: 'green' | 'purple';
  /** Incrementar após salvar para recarregar. */
  refreshKey?: number | string;
  onEdit: (prescricao: Prescricao) => void;
  onReplicate: (prescricao: Prescricao) => void;
  /** Oculta Editar/Copiar — só abre descrição via clique no item. */
  readOnly?: boolean;
  className?: string;
  maxHeightClassName?: string;
};

/**
 * Histórico de prescricões do paciente (mesma fonte de /meta → Exames/Prescrições).
 */
export default function PrescricaoHistoricoTab({
  pacienteId,
  accent = 'green',
  refreshKey = 0,
  onEdit,
  onReplicate,
  readOnly = false,
  className = '',
  maxHeightClassName = 'max-h-[min(70vh,520px)]',
}: PrescricaoHistoricoTabProps) {
  const [lista, setLista] = useState<Prescricao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!pacienteId) {
      setLista([]);
      setLoading(false);
      setErro(null);
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const raw = await PrescricaoService.getPrescricoesByPaciente(pacienteId);
      setLista(raw.filter((p) => !p.isTemplate));
    } catch (e) {
      console.error(e);
      setErro('Não foi possível carregar o histórico.');
      setLista([]);
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    void carregar();
  }, [carregar, refreshKey]);

  if (!pacienteId) {
    return (
      <div className={`rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-600 ${className}`}>
        Selecione um paciente para ver o histórico.
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center py-14 text-gray-600 ${className}`}>
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm">Carregando histórico…</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className={`rounded-lg border border-red-200 bg-red-50 p-5 text-center text-sm text-red-800 ${className}`}>
        {erro}
      </div>
    );
  }

  if (lista.length === 0) {
    return (
      <div className={`rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm ${className}`}>
        <FileText className="mx-auto mb-3 h-12 w-12 text-gray-400" />
        <h3 className="mb-1 text-base font-semibold text-gray-900">Nenhuma prescrição no histórico</h3>
        <p className="text-sm text-gray-600">
          Ao clicar em Salvar, a prescrição fica registrada aqui e também na página do paciente em Exames /
          Prescrições.
        </p>
      </div>
    );
  }

  const isPurple = accent === 'purple';
  const btnPrimary = isPurple
    ? 'bg-purple-600 hover:bg-purple-700'
    : 'bg-emerald-600 hover:bg-emerald-700';
  const btnSecondary = isPurple
    ? 'border-purple-200 text-purple-800 hover:bg-purple-50'
    : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50';
  const rowHover = isPurple
    ? 'hover:bg-purple-50/60 active:bg-purple-50/80 border-l-transparent hover:border-l-purple-500'
    : 'hover:bg-emerald-50/50 active:bg-emerald-50/70 border-l-transparent hover:border-l-emerald-500/70';
  const iconWrapRecibo = 'bg-teal-100 text-teal-700 ring-teal-200/60';
  const iconWrapRx = isPurple
    ? 'bg-purple-100 text-purple-700 ring-purple-200/60'
    : 'bg-emerald-100 text-emerald-700 ring-emerald-200/60';

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        className={`border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm flex flex-col ${maxHeightClassName}`}
      >
        <ul className="overflow-y-auto overscroll-contain divide-y divide-gray-100 min-h-0 flex-1">
          {lista.map((p) => {
            const isRecibo = p.tipoDocumento === 'recibo_medico';
            return (
              <li key={p.id} className={`group flex items-stretch border-l-4 ${rowHover}`}>
                <button
                  type="button"
                  onClick={() => onEdit(p)}
                  className={`min-w-0 flex-1 text-left flex items-start gap-3 sm:gap-4 px-4 py-4 sm:py-3.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset ${
                    isPurple ? 'focus-visible:ring-purple-400' : 'focus-visible:ring-emerald-400'
                  }`}
                  title={readOnly ? 'Abrir descrição' : 'Abrir na Descrição para editar'}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${
                      isRecibo ? iconWrapRecibo : iconWrapRx
                    }`}
                    aria-hidden
                  >
                    {isRecibo ? (
                      <Receipt className="h-5 w-5" strokeWidth={2} />
                    ) : (
                      <Pill className="h-5 w-5" strokeWidth={2} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2 gap-y-1">
                      <span className="font-semibold text-gray-900 text-sm sm:text-[15px] leading-snug line-clamp-2">
                        {p.nome || 'Sem título'}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${
                          isRecibo
                            ? 'bg-teal-100 text-teal-800 border border-teal-200/80'
                            : isPurple
                              ? 'bg-purple-100 text-purple-800 border border-purple-200/80'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200/80'
                        }`}
                      >
                        {isRecibo ? 'Recibo' : 'Prescrição'}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                      <span>Atualizado {formatarDataHora(p.atualizadoEm)}</span>
                    </p>
                  </div>
                </button>

                {!readOnly ? (
                  <div className="flex shrink-0 flex-col justify-center gap-1.5 border-l border-gray-100 bg-gray-50/80 px-2 py-2 sm:flex-row sm:items-center sm:gap-2 sm:px-3">
                    <button
                      type="button"
                      onClick={() => onEdit(p)}
                      className={`inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold text-white sm:px-3 ${btnPrimary}`}
                      title="Editar na Descrição"
                    >
                      <Pencil size={14} strokeWidth={2.25} />
                      <span className="hidden sm:inline">Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onReplicate(p)}
                      className={`inline-flex items-center justify-center gap-1 rounded-lg border bg-white px-2.5 py-2 text-xs font-semibold sm:px-3 ${btnSecondary}`}
                      title="Usar como nova"
                    >
                      <Copy size={14} strokeWidth={2.25} />
                      <span className="hidden sm:inline">Copiar</span>
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-center text-xs text-gray-500">
        {readOnly
          ? 'Clique para ver a descrição da prescrição.'
          : 'Clique para editar na Descrição, ou use Copiar para criar uma nova a partir dela.'}
      </p>
    </div>
  );
}
