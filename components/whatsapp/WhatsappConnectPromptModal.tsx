'use client';

import { MessageCircle, WifiOff } from 'lucide-react';

type Props = {
  onConnect: () => void;
  onDismiss: () => void;
};

/**
 * Alerta de abertura de página quando o WhatsApp está desconectado.
 * O CTA leva o profissional direto à tela de conexão.
 */
export default function WhatsappConnectPromptModal({ onConnect, onDismiss }: Props) {
  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="whatsapp-connect-prompt-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A1F44] p-6 text-[#E8EDED] shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-400/15">
            <WifiOff className="h-6 w-6 text-amber-300 animate-pulse" aria-hidden />
            <span className="pointer-events-none absolute inset-0 rounded-full border border-amber-300/60 animate-hint-pulse" />
          </span>
          <p
            id="whatsapp-connect-prompt-title"
            className="text-xl font-bold leading-tight text-[#E8EDED]"
          >
            WhatsApp desconectado
          </p>
        </div>
        <p className="text-sm leading-relaxed text-[#E8EDED]/75">
          Conecte agora para enviar mensagens, lembretes e automações. Sem o WhatsApp
          conectado, esses envios ficam pausados.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onConnect}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#4CCB7A] px-4 py-3 text-sm font-semibold text-[#0A1F44] transition-colors hover:bg-[#45b86d]"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Conectar
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-[#E8EDED] transition-colors hover:bg-white/10"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
