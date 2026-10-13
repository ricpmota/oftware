'use client';

import { useState } from 'react';
import { Loader2, MessageCircle, Send } from 'lucide-react';
import { nutriAgendaAuthFetch } from '@/lib/nutri/agenda/nutriAgendaAuthFetch';
import { buildWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';

type Preview = {
  ok?: boolean;
  error?: string;
  message?: string;
  waUrl?: string;
};

type Props = {
  pacienteId: string;
  stacked?: boolean;
  /** Só o ícone do WhatsApp (mobile): abre a conversa manual com o paciente. */
  iconOnly?: boolean;
  phone?: string | null;
  telefoneDdi?: string | null;
  telefoneE164?: string | null;
};

function whatsappChatUrl(
  phone?: string | null,
  telefoneDdi?: string | null,
  telefoneE164?: string | null,
): string | null {
  return buildWhatsappUrl({
    telefone: phone,
    telefoneDdi,
    telefoneE164,
  });
}

export default function MetanutriPacienteWelcomeActions({
  pacienteId,
  stacked = false,
  iconOnly = false,
  phone,
  telefoneDdi,
  telefoneE164,
}: Props) {
  const [sending, setSending] = useState(false);
  const [opening, setOpening] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const busy = sending || opening;

  const handleSend = async () => {
    setSending(true);
    setFeedback(null);
    try {
      const res = await nutriAgendaAuthFetch(
        `/api/metanutri/pacientes/${encodeURIComponent(pacienteId)}/welcome-whatsapp`,
        { method: 'POST' }
      );
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || 'Não foi possível enviar a mensagem.');
      }
      setFeedback({ ok: true, text: 'Boas-vindas enviada.' });
    } catch (err) {
      setFeedback({ ok: false, text: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  const handleOpenWhatsapp = async () => {
    const direct = whatsappChatUrl(phone, telefoneDdi, telefoneE164);
    if (direct) {
      window.open(direct, '_blank', 'noopener,noreferrer');
      return;
    }
    setOpening(true);
    setFeedback(null);
    try {
      const res = await nutriAgendaAuthFetch(
        `/api/metanutri/pacientes/${encodeURIComponent(pacienteId)}/welcome-whatsapp`
      );
      const data = (await res.json()) as Preview;
      if (!res.ok || !data.waUrl) {
        throw new Error(data.error || 'Não foi possível abrir o WhatsApp.');
      }
      window.open(data.waUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setFeedback({ ok: false, text: (err as Error).message });
    } finally {
      setOpening(false);
    }
  };

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={() => void handleOpenWhatsapp()}
        disabled={busy}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        title="Abrir WhatsApp com o paciente"
        aria-label="Abrir WhatsApp com o paciente"
      >
        {opening ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <MessageCircle className="h-4 w-4" aria-hidden />
        )}
      </button>
    );
  }

  return (
    <div className={`flex flex-col gap-1 ${stacked ? 'w-full items-stretch' : 'items-end'}`}>
      <div className={`flex gap-1.5 ${stacked ? 'w-full flex-col' : 'items-center'}`}>
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={busy}
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${
            stacked ? 'w-full justify-center py-1' : ''
          }`}
          title="Enviar a mensagem de boas-vindas pelo WhatsApp conectado"
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Send className="h-3.5 w-3.5" aria-hidden />
          )}
          Boas-vindas
        </button>
        <button
          type="button"
          onClick={() => void handleOpenWhatsapp()}
          disabled={busy}
          className={`inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${
            stacked ? 'w-full justify-center py-1' : ''
          }`}
          title="Abrir o WhatsApp com a mensagem pronta para envio manual"
        >
          {opening ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          )}
          WhatsApp
        </button>
      </div>
      {feedback ? (
        <p
          className={`max-w-[16rem] text-right text-[10px] leading-tight ${
            feedback.ok ? 'text-emerald-700' : 'text-rose-700'
          }`}
        >
          {feedback.text}
        </p>
      ) : null}
    </div>
  );
}
