'use client';

import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, CircleDollarSign, Loader2, MessageCircle, X } from 'lucide-react';

export type CobrancaConfirmTarget = {
  pacienteId: string;
  pacienteNome: string;
  valorAberto: number;
  linhaId?: string;
};

export type CobrancaSubmitStatus = 'sent' | 'confirmation_sent' | 'awaiting_confirmation';

type PreviewData = {
  phone: string;
  pacienteNome: string;
  message: string;
  valorLabel: string;
  canalChatConnected: boolean;
  canalChatVerified: boolean;
  pendingPaymentCharge: boolean;
};

type Props = {
  target: CobrancaConfirmTarget;
  getAuthToken: () => Promise<string | null>;
  onCancel: () => void;
  onConfirm: () => void | Promise<void | CobrancaSubmitStatus>;
  confirming?: boolean;
  zIndexClass?: string;
};

function formatMoney(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Confirma envio de cobrança via Canal Chat — mostra valor e prévia da mensagem.
 */
export default function CobrancaWhatsappConfirmModal({
  target,
  getAuthToken,
  onCancel,
  onConfirm,
  confirming = false,
  zIndexClass = 'z-[80]',
}: Props) {
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const getAuthTokenRef = useRef(getAuthToken);
  getAuthTokenRef.current = getAuthToken;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPreview(true);
      setPreviewError(null);
      setPreview(null);
      try {
        const token = await getAuthTokenRef.current();
        if (!token) {
          if (!cancelled) setPreviewError('Sessão expirada. Faça login novamente.');
          return;
        }
        const res = await fetch('/api/metaadmin/financeiro/cobranca-whatsapp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            pacienteId: target.pacienteId,
            valorAberto: target.valorAberto,
            preview: true,
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          phone?: string;
          pacienteNome?: string;
          message?: string;
          valorLabel?: string;
          canalChatConnected?: boolean;
          canalChatVerified?: boolean;
          pendingPaymentCharge?: boolean;
        } | null;
        if (cancelled) return;
        if (!res.ok || data?.ok === false || !data?.message) {
          setPreviewError(data?.error || 'Não foi possível montar a prévia da cobrança.');
          return;
        }
        setPreview({
          phone: data.phone || '',
          pacienteNome: data.pacienteNome || target.pacienteNome,
          message: data.message,
          valorLabel: data.valorLabel || formatMoney(target.valorAberto),
          canalChatConnected: data.canalChatConnected !== false,
          canalChatVerified: data.canalChatVerified === true,
          pendingPaymentCharge: data.pendingPaymentCharge === true,
        });
      } catch (error) {
        if (cancelled) return;
        console.error('Erro ao carregar prévia de cobrança:', error);
        setPreviewError('Erro ao carregar prévia da cobrança.');
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [target.pacienteId, target.valorAberto, target.pacienteNome]);

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-black/50 backdrop-blur-sm p-4`}
      role="presentation"
      onClick={confirming ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cobranca-confirm-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-amber-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <CircleDollarSign className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 id="cobranca-confirm-title" className="text-sm font-semibold text-slate-900">
                Enviar cobrança?
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 truncate">
                Canal Chat · {preview?.pacienteNome || target.pacienteNome}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="p-2 rounded-lg text-slate-500 hover:bg-amber-100/80 disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Valor da cobrança
            </p>
            <p className="text-lg font-bold text-amber-950 tabular-nums mt-0.5">
              {preview?.valorLabel || formatMoney(target.valorAberto)}
            </p>
          </div>

          {loadingPreview ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Montando prévia da mensagem…
            </div>
          ) : previewError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
              {previewError}
            </div>
          ) : preview ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <MessageCircle className="h-3.5 w-3.5" />
                Mensagem que será enviada
              </div>
              {preview.phone ? (
                <p className="text-xs text-slate-500">
                  Destino: <span className="font-medium text-slate-700">{preview.phone}</span>
                </p>
              ) : null}
              {!preview.canalChatConnected ? (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  Canal Chat parece desconectado. Conecte em Automações antes de enviar.
                </p>
              ) : null}
              {preview.canalChatVerified ? (
                <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 inline-flex items-center gap-1.5">
                  <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[color:var(--state-success,#059669)]" />
                  Canal Chat confirmado
                </p>
              ) : null}
              <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 font-sans leading-relaxed max-h-56 overflow-y-auto">
                {preview.message}
              </pre>
            </div>
          ) : null}
        </div>

        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/80">
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={confirming}
              className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                void onConfirm();
              }}
              disabled={confirming || loadingPreview || Boolean(previewError) || !preview}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-amber-600 rounded-xl hover:bg-amber-700 disabled:opacity-50"
            >
              {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleDollarSign className="h-4 w-4" />}
              Enviar cobrança
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
