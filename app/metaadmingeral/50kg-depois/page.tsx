'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, BookOpen, ChevronRight, Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { cinquentaKgDepoisAcessarUrl } from '@/lib/50kgdepois/cinquentaKgDepoisLogin';
import { cinquentaKgDepoisAuthFetch } from '@/lib/50kgdepois/clientAuthFetch';
import { META_ADMIN_GERAL_BRANDING, META_ADMIN_GERAL_SHELL } from '@/lib/metaadmin/metaAdminGeralBranding';
import { MetaAdminGeralLoadingScreen } from '@/components/metaadmingeral/MetaAdminGeralBrandMark';
import type { CinquentaKgDepoisParticipant } from '@/types/cinquentaKgDepois';

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

function statusLabel(status: CinquentaKgDepoisParticipant['status']): string {
  if (status === 'COMPLETED') return 'Concluído';
  if (status === 'IN_PROGRESS') return 'Em andamento';
  return 'Não iniciado';
}

export default function CinquentaKgDepoisAdminHubPage() {
  const router = useRouter();
  const [userLoading, setUserLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<CinquentaKgDepoisParticipant[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUserLoading(false);
      if (!u) {
        router.replace(cinquentaKgDepoisAcessarUrl('/metaadmingeral/50kg-depois'));
        return;
      }
      setAuthorized(true);
    });
    return () => unsub();
  }, [router]);

  const loadParticipants = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await cinquentaKgDepoisAuthFetch('/api/metaadmingeral/50kg-depois/participants');
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        participants?: CinquentaKgDepoisParticipant[];
      };
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar participantes.');
      setParticipants(data.participants || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authorized) return;
    void loadParticipants();
  }, [authorized, loadParticipants]);

  if (userLoading || !authorized) {
    return <MetaAdminGeralLoadingScreen />;
  }

  const sortedParticipants = [...participants].sort((a, b) =>
    (b.updatedAt || '').localeCompare(a.updatedAt || '')
  );

  return (
    <div className={`${META_ADMIN_GERAL_SHELL.page} min-h-screen`}>
      <header className="shrink-0 border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={() => router.push('/metaadmingeral?menu=platform-patrimonio')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          MetaAdminGeral · {META_ADMIN_GERAL_BRANDING.productName}
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#E8EDED]">50 KG DEPOIS</h1>
          <p className="mt-1 text-sm text-[#E8EDED]/60">
            Banco biográfico e documental do projeto editorial.
          </p>
          <p className="mt-2 text-xs text-[#E8EDED]/45">
            Também disponível em{' '}
            <button
              type="button"
              onClick={() => router.push('/50kgdepois/respostas')}
              className="text-[#4CCB7A] hover:underline"
            >
              /50kgdepois/respostas
            </button>
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-[#E8EDED]/70 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando participantes...
          </div>
        ) : error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : sortedParticipants.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-[#E8EDED]/70">
            Nenhum participante registrado ainda. Quando a entrevista for iniciada, o registro aparecerá aqui.
          </div>
        ) : (
          <div className="grid gap-4">
            {sortedParticipants.map((participant) => (
              <button
                key={participant.participantId}
                type="button"
                onClick={() =>
                  router.push(`/metaadmingeral/50kg-depois/${participant.participantId}`)
                }
                className="group rounded-2xl border border-white/10 bg-white/5 p-5 text-left hover:border-[#4CCB7A]/40 hover:bg-[#4CCB7A]/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4CCB7A]/15 text-[#4CCB7A]">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-[#E8EDED]">{participant.participantName}</h2>
                      <p className="text-sm text-[#E8EDED]/60">{participant.weightJourneyLabel}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#E8EDED]/30 group-hover:text-[#4CCB7A]/70" />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3 text-sm">
                  <div>
                    <p className="text-[#E8EDED]/50 text-xs">Status</p>
                    <p className="text-[#E8EDED]">{statusLabel(participant.status)}</p>
                  </div>
                  <div>
                    <p className="text-[#E8EDED]/50 text-xs">Progresso</p>
                    <p className="text-[#E8EDED]">{participant.progressPercent}%</p>
                  </div>
                  <div>
                    <p className="text-[#E8EDED]/50 text-xs">Última atualização</p>
                    <p className="text-[#E8EDED]">{formatDateTime(participant.updatedAt)}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs font-medium text-[#4CCB7A]">VER RESPOSTAS</p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
