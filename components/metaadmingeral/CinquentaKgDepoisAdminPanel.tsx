'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { AlertTriangle, ExternalLink, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import CinquentaKgDepoisResponsesPanel from '@/components/50kgdepois/CinquentaKgDepoisResponsesPanel';
import { auth } from '@/lib/firebase';
import { CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT } from '@/lib/50kgdepois/constants';
import type {
  CinquentaKgDepoisParticipant,
  CinquentaKgDepoisSessionPayload,
} from '@/types/cinquentaKgDepois';

type CinquentaKgDepoisAdminPanelProps = {
  user: User;
};

async function authFetch(url: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Não autenticado.');
  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso || '—';
  }
}

function statusLabel(status: CinquentaKgDepoisParticipant['status']): string {
  if (status === 'COMPLETED') return 'Concluído';
  if (status === 'IN_PROGRESS') return 'Em andamento';
  return 'Não iniciado';
}

export default function CinquentaKgDepoisAdminPanel({ user }: CinquentaKgDepoisAdminPanelProps) {
  const participantId = CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT.id;
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<CinquentaKgDepoisSessionPayload | null>(null);
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(
        `/api/metaadmingeral/50kg-depois/participants/${encodeURIComponent(participantId)}`
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        session?: CinquentaKgDepoisSessionPayload;
      };
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar respostas.');
      setSession(data.session || null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [participantId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession, user.uid]);

  const handleReset = async () => {
    if (confirmPhrase.trim() !== 'ZERAR') {
      setResetError('Digite ZERAR para confirmar.');
      return;
    }
    setResetting(true);
    setResetError('');
    try {
      const res = await authFetch('/api/metaadmingeral/50kg-depois/reset', {
        method: 'POST',
        body: JSON.stringify({ participantId, confirmPhrase: 'ZERAR' }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Erro ao zerar entrevista.');
      setResetOpen(false);
      setConfirmPhrase('');
      await loadSession();
    } catch (err) {
      setResetError((err as Error).message);
    } finally {
      setResetting(false);
    }
  };

  const participant = session?.participant;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#E8EDED]">50 KG DEPOIS</h2>
          <p className="mt-1 text-sm text-[#E8EDED]/60 max-w-2xl">
            Banco biográfico e documental do projeto editorial — respostas da entrevista de Antônio.
          </p>
        </div>
        <a
          href="/50kgdepois"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 self-start rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-[#E8EDED]/80 hover:bg-white/10"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir entrevista
        </a>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[#E8EDED]/70 text-sm py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando respostas...
        </div>
      ) : error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : !session || !participant ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-[#E8EDED]/70">
          Nenhuma resposta registrada ainda. Quando Antônio iniciar a entrevista em{' '}
          <code className="text-[#4CCB7A]/90">/50kgdepois</code>, o conteúdo aparecerá aqui.
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#E8EDED]">{participant.participantName}</h3>
                <p className="text-sm text-[#E8EDED]/60">{participant.weightJourneyLabel}</p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm sm:gap-8">
                <div>
                  <p className="text-[#E8EDED]/45 text-xs">Status</p>
                  <p className="text-[#E8EDED]">{statusLabel(participant.status)}</p>
                </div>
                <div>
                  <p className="text-[#E8EDED]/45 text-xs">Progresso</p>
                  <p className="text-[#E8EDED]">{participant.progressPercent}%</p>
                </div>
                <div>
                  <p className="text-[#E8EDED]/45 text-xs">Atualizado</p>
                  <p className="text-[#E8EDED] text-xs sm:text-sm">
                    {formatDateTime(participant.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <CinquentaKgDepoisResponsesPanel session={session} variant="dark" />

          <section className="rounded-2xl border border-red-500/25 bg-red-950/20 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-300 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-100">Zona de perigo</h3>
                <p className="mt-1 text-xs text-red-200/70 leading-relaxed max-w-2xl">
                  Apaga todas as respostas, memórias livres e o progresso da entrevista. O participante
                  voltará ao início como se nunca tivesse respondido. Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>

            {!resetOpen ? (
              <button
                type="button"
                onClick={() => {
                  setResetOpen(true);
                  setConfirmPhrase('');
                  setResetError('');
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-100 hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4" />
                Zerar todas as respostas
              </button>
            ) : (
              <div className="rounded-xl border border-red-400/20 bg-black/20 p-4 space-y-3 max-w-md">
                <p className="text-xs text-red-100/90">
                  Digite <strong className="font-mono">ZERAR</strong> para confirmar a exclusão de todo
                  o conteúdo de Antônio.
                </p>
                <input
                  value={confirmPhrase}
                  onChange={(e) => {
                    setConfirmPhrase(e.target.value);
                    setResetError('');
                  }}
                  placeholder="ZERAR"
                  className="w-full rounded-lg border border-red-400/30 bg-white/5 px-3 py-2 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/30 font-mono uppercase"
                  autoComplete="off"
                />
                {resetError && <p className="text-xs text-red-300">{resetError}</p>}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={resetting}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {resetting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    Confirmar exclusão
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetOpen(false);
                      setConfirmPhrase('');
                      setResetError('');
                    }}
                    disabled={resetting}
                    className="rounded-lg border border-white/15 px-4 py-2 text-sm text-[#E8EDED]/80 hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
