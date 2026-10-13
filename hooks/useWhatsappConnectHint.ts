'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Options = {
  apiBasePath: string;
  getAuthToken: () => Promise<string | null>;
  /** Só busca quando a sessão estiver pronta (ex.: user != null). */
  ready?: boolean;
};

export type WhatsappConnectHintState = {
  /** Balão piscante no atalho do WhatsApp enquanto estiver desconectado. */
  showBalloon: boolean;
  /** Modal de abertura da página enquanto o WhatsApp estiver desconectado. */
  showPrompt: boolean;
  dismissPrompt: () => void;
  dismissBalloon: () => void;
};

/**
 * Ao abrir a página, se o WhatsApp não estiver conectado:
 * - exibe o alerta de conexão até o profissional conectar ou dispensar;
 * - mantém o balão piscante no menu até a página do WhatsApp ser aberta.
 */
export function useWhatsappConnectHint({
  apiBasePath,
  getAuthToken,
  ready = true,
}: Options): WhatsappConnectHintState {
  const [showBalloon, setShowBalloon] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const startedRef = useRef(false);
  const getTokenRef = useRef(getAuthToken);
  getTokenRef.current = getAuthToken;

  const dismissPrompt = useCallback(() => setShowPrompt(false), []);
  const dismissBalloon = useCallback(() => setShowBalloon(false), []);

  useEffect(() => {
    if (!ready || startedRef.current) return;

    let cancelled = false;

    const run = async () => {
      try {
        const token = await getTokenRef.current();
        if (!token || cancelled) return;
        startedRef.current = true;

        const base = apiBasePath.replace(/\/$/, '');
        const res = await fetch(`${base}/status`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok || cancelled) return;

        const data = (await res.json()) as { status?: string };
        if (data.status === 'connected') return;

        setShowBalloon(true);
        setShowPrompt(true);
      } catch {
        // silencioso — não bloquear a UI
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [ready, apiBasePath]);

  return { showBalloon, showPrompt, dismissPrompt, dismissBalloon };
}
