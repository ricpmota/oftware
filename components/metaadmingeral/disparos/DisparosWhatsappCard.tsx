'use client';

import { useEffect, useRef, useState } from 'react';
import { DISPAROS_WHATSAPP_ROUTES, DISPAROS_WHATSAPP_SESSION_ID } from '@/lib/disparos/constants';
import { whatsappStatusLabel } from '@/lib/disparos/labels';
import type { DisparosWhatsappStatus, DisparosWhatsappView } from '@/lib/disparos/types';
import { disparosViewFromConnection } from '@/lib/disparos/whatsappView';
import { DisparosBadge, DisparosSectionTitle, DisparosSoftCard } from '@/components/metaadmingeral/disparos/disparosUi';

const POLL_MS = 5_000;

function toneFor(status: DisparosWhatsappStatus): 'success' | 'warn' | 'danger' | 'info' {
  if (status === 'connected') return 'success';
  if (status === 'connecting' || status === 'qr_pending') return 'info';
  if (status === 'error' || status === 'unavailable') return 'danger';
  return 'warn';
}

function formatWhen(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR');
}

function qrSrc(value: string): string {
  if (value.startsWith('data:image/')) return value;
  return `data:image/png;base64,${value}`;
}

type ConnectionPayload = {
  ok?: boolean;
  error?: string;
  status?: string;
  connection?: {
    status?: string;
    phone?: string;
    profileName?: string;
    qrCode?: string;
    updatedAt?: string;
    lastCheckAt?: string;
    errorMessage?: string;
  } | null;
};

type Props = {
  connection: DisparosWhatsappView;
  getAuthToken: () => Promise<string>;
  onConnectionChange: (next: DisparosWhatsappView) => void;
};

export default function DisparosWhatsappCard({ connection, getAuthToken, onConnectionChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const tokenRef = useRef(getAuthToken);
  const onChangeRef = useRef(onConnectionChange);
  const busyRef = useRef(false);
  tokenRef.current = getAuthToken;
  onChangeRef.current = onConnectionChange;

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      if (busyRef.current) return;
      try {
        const token = await tokenRef.current();
        const response = await fetch(DISPAROS_WHATSAPP_ROUTES.status, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const body = (await response.json().catch(() => ({}))) as ConnectionPayload;
        if (cancelled) return;
        if (!response.ok) {
          onChangeRef.current(
            disparosViewFromConnection(
              {
                status: 'unavailable',
                errorMessage: body.error || 'Não foi possível consultar o WhatsApp de Disparos.',
              },
              'unavailable',
            ),
          );
          return;
        }
        onChangeRef.current(
          disparosViewFromConnection({
            status: body.connection?.status || body.status,
            phone: body.connection?.phone,
            profileName: body.connection?.profileName,
            qrCode: body.connection?.qrCode,
            updatedAt: body.connection?.updatedAt,
            lastCheckAt: body.connection?.lastCheckAt,
            errorMessage: body.connection?.errorMessage,
          }),
        );
      } catch {
        if (!cancelled) {
          onChangeRef.current(
            disparosViewFromConnection(
              { status: 'unavailable', errorMessage: 'Não foi possível consultar o WhatsApp de Disparos.' },
              'unavailable',
            ),
          );
        }
      }
    }

    void refresh();
    if (connection.status !== 'qr_pending') return () => { cancelled = true; };
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [connection.status]);

  async function connect() {
    busyRef.current = true;
    setBusy(true);
    onConnectionChange(disparosViewFromConnection({ status: 'connecting' }, 'connecting'));
    try {
      const token = await getAuthToken();
      const response = await fetch(DISPAROS_WHATSAPP_ROUTES.startSession, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await response.json().catch(() => ({}))) as ConnectionPayload;
      if (!response.ok) {
        onConnectionChange(
          disparosViewFromConnection(
            {
              status: 'error',
              errorMessage: body.error || 'Não foi possível iniciar o WhatsApp de Disparos.',
            },
            'error',
          ),
        );
        return;
      }
      onConnectionChange(
        disparosViewFromConnection({
          status: body.connection?.status || body.status || 'qr_pending',
          phone: body.connection?.phone,
          profileName: body.connection?.profileName,
          qrCode: body.connection?.qrCode,
          updatedAt: body.connection?.updatedAt,
          lastCheckAt: body.connection?.lastCheckAt,
          errorMessage: body.error || body.connection?.errorMessage,
        }),
      );
    } catch {
      onConnectionChange(
        disparosViewFromConnection(
          { status: 'error', errorMessage: 'Não foi possível iniciar o WhatsApp de Disparos.' },
          'error',
        ),
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function disconnect() {
    busyRef.current = true;
    setBusy(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(DISPAROS_WHATSAPP_ROUTES.disconnect, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = (await response.json().catch(() => ({}))) as ConnectionPayload;
      if (!response.ok) {
        onConnectionChange(
          disparosViewFromConnection(
            {
              ...connection,
              status: 'error',
              errorMessage: body.error || 'Não foi possível desconectar o WhatsApp de Disparos.',
            },
            'error',
          ),
        );
        return;
      }
      setConfirmOpen(false);
      onConnectionChange(
        disparosViewFromConnection({
          status: 'disconnected',
          updatedAt: body.connection?.updatedAt,
          errorMessage: body.error,
        }),
      );
    } catch {
      onConnectionChange(
        disparosViewFromConnection(
          { status: 'error', errorMessage: 'Não foi possível desconectar o WhatsApp de Disparos.' },
          'error',
        ),
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const connected = connection.status === 'connected';
  const waiting = connection.status === 'connecting' || connection.status === 'qr_pending' || busy;

  return (
    <DisparosSoftCard>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <DisparosSectionTitle
          title="WhatsApp de Disparos"
          hint={`Número usado só por este módulo. A sessão é ${DISPAROS_WHATSAPP_SESSION_ID}.`}
        />
        <DisparosBadge label={whatsappStatusLabel(connection.status)} tone={toneFor(connection.status)} />
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#E8EDED]/45">Telefone</dt>
          <dd className="mt-1 text-sm text-[#E8EDED]">{connection.phone || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#E8EDED]/45">Nome</dt>
          <dd className="mt-1 text-sm text-[#E8EDED]">{connection.profileName || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#E8EDED]/45">Sessão</dt>
          <dd className="mt-1 text-sm text-[#E8EDED]/70">{DISPAROS_WHATSAPP_SESSION_ID}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#E8EDED]/45">Última atualização</dt>
          <dd className="mt-1 text-sm text-[#E8EDED]">{formatWhen(connection.updatedAt)}</dd>
        </div>
      </dl>

      {connection.status === 'qr_pending' ? (
        <div className="mt-5 flex flex-col items-start gap-3">
          <p className="text-sm text-[#E8EDED]/70">Escaneie o QR Code no WhatsApp deste número de disparos.</p>
          {connection.qrCode ? (
            <img
              src={qrSrc(connection.qrCode)}
              alt="QR Code do WhatsApp de Disparos"
              className="h-56 w-56 rounded-xl bg-white p-2"
            />
          ) : (
            <p className="text-sm text-[#E8EDED]/70">Gerando o QR Code…</p>
          )}
        </div>
      ) : null}

      {connection.errorMessage ? <p className="mt-4 text-sm text-rose-200">{connection.errorMessage}</p> : null}

      <div className="mt-5">
        {connected ? (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
            className="inline-flex items-center rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-[#E8EDED] hover:bg-white/5 disabled:opacity-60"
          >
            Desconectar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void connect()}
            disabled={waiting}
            className="inline-flex items-center rounded-xl bg-[#4CCB7A] px-4 py-2.5 text-sm font-semibold text-[#062015] hover:bg-[#3db86a] disabled:cursor-wait disabled:opacity-60"
          >
            {connection.status === 'connecting' || busy ? 'Iniciando…' : 'Conectar WhatsApp'}
          </button>
        )}
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A1F44] p-5 shadow-xl">
            <h4 className="text-base font-semibold text-[#E8EDED]">Desconectar WhatsApp de Disparos?</h4>
            <p className="mt-2 text-sm text-[#E8EDED]/70">
              Isso encerrará a sessão utilizada exclusivamente pelo módulo Disparos.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={busy}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-[#E8EDED] hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void disconnect()}
                disabled={busy}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? 'Desconectando…' : 'Desconectar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DisparosSoftCard>
  );
}
