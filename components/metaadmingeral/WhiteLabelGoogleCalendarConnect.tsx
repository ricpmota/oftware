'use client';

import { useCallback, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { Calendar, CheckCircle2, ExternalLink, Loader2, Unplug } from 'lucide-react';

type CalendarStatus = {
  configured: boolean;
  authorized: boolean;
  email: string | null;
  userId: string | null;
  hasRefreshToken: boolean;
};

async function authFetch(url: string, init?: RequestInit) {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente.');
  const token = await user.getIdToken();
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
}

export default function WhiteLabelGoogleCalendarConnect() {
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/metaadmingeral/whitelabel/calendar/status');
      const data = (await res.json()) as { status?: CalendarStatus; error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao verificar agenda.');
      setStatus(data.status || null);
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const sync = params.get('calendar_sync');
    const error = params.get('error');
    if (sync === 'success') {
      setMessage({ type: 'ok', text: 'Google Calendar conectado com sucesso.' });
      load();
    } else if (error) {
      setMessage({
        type: 'err',
        text: 'Não foi possível conectar o Google Calendar. Tente novamente.',
      });
    }
  }, [load]);

  const connect = useCallback(async () => {
    const user = auth.currentUser;
    if (!user?.email) {
      setMessage({ type: 'err', text: 'Faça login novamente para conectar a agenda.' });
      return;
    }

    setConnecting(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({
        userId: user.uid,
        email: user.email,
        tipo: 'whitelabel',
      });
      const res = await fetch(`/api/google-calendar/auth?${params}`);
      const data = (await res.json()) as { authUrl?: string; error?: string };
      if (!res.ok || !data.authUrl) {
        throw new Error(data.error || 'Falha ao iniciar autorização.');
      }
      window.location.href = data.authUrl;
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
      setConnecting(false);
    }
  }, []);

  const isReady = status?.authorized;
  const needsReconnect = status?.configured && !status.authorized;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#4CCB7A]" />
          <div>
            <h3 className="text-lg font-bold text-[#E8EDED]">Google Calendar & Meet</h3>
            <p className="text-sm text-[#E8EDED]/60">
              Necessário para criar convites e links do Google Meet ao agendar reuniões pelo /whitelabel
            </p>
          </div>
        </div>
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-[#4CCB7A] shrink-0" />
        ) : isReady ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Conectado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-200 border border-amber-500/30">
            <Unplug className="w-3.5 h-3.5" />
            Não conectado
          </span>
        )}
      </div>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'bg-red-500/15 text-red-300 border border-red-500/30'
          }`}
        >
          {message.text}
        </div>
      )}

      {!loading && (
        <div className="rounded-xl border border-white/10 bg-[#0A1F44]/40 px-4 py-3 space-y-2">
          {isReady ? (
            <>
              <p className="text-sm text-[#E8EDED]/80">
                Agenda conectada: <span className="font-medium text-[#E8EDED]">{status?.email}</span>
              </p>
              <p className="text-xs text-[#E8EDED]/50">
                Novos agendamentos do formulário público criarão eventos nesta conta com convite por e-mail e link do
                Meet.
              </p>
            </>
          ) : needsReconnect ? (
            <>
              <p className="text-sm text-amber-200">
                A conexão expirou ou está inválida
                {status?.email ? ` (${status.email})` : ''}. Reconecte para voltar a gerar convites automaticamente.
              </p>
              <p className="text-xs text-[#E8EDED]/50">
                Leads já criados continuam salvos; apenas a criação automática de eventos no Google fica pausada.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-[#E8EDED]/80">
                Conecte a conta Google que receberá as reuniões White Label. Recomendamos usar a mesma conta do
                administrador geral.
              </p>
              <p className="text-xs text-[#E8EDED]/50">
                Sem essa conexão, o horário é reservado e o lead é criado, mas o convite e o Meet não são gerados
                automaticamente.
              </p>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={connect}
          disabled={loading || connecting}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4CCB7A] text-[#0A1F44] font-semibold text-sm hover:bg-[#45b86d] disabled:opacity-50"
        >
          {connecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4" />
          )}
          {isReady ? 'Reconectar Google Calendar' : 'Conectar Google Calendar'}
        </button>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 text-sm text-[#E8EDED]/80 hover:bg-white/5 disabled:opacity-50"
        >
          Verificar status
        </button>
      </div>
    </div>
  );
}
