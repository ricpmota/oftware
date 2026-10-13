'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, Loader2 } from 'lucide-react';
import CinquentaKgDepoisResponsesPanel from '@/components/50kgdepois/CinquentaKgDepoisResponsesPanel';
import { auth } from '@/lib/firebase';
import { cinquentaKgDepoisAcessarUrl } from '@/lib/50kgdepois/cinquentaKgDepoisLogin';
import { cinquentaKgDepoisAuthFetch } from '@/lib/50kgdepois/clientAuthFetch';
import { META_ADMIN_GERAL_BRANDING, META_ADMIN_GERAL_SHELL } from '@/lib/metaadmin/metaAdminGeralBranding';
import { MetaAdminGeralLoadingScreen } from '@/components/metaadmingeral/MetaAdminGeralBrandMark';
import type { CinquentaKgDepoisSessionPayload } from '@/types/cinquentaKgDepois';

export default function CinquentaKgDepoisParticipantAdminPage() {
  const router = useRouter();
  const params = useParams();
  const participantId = String(params.participantId || '');

  const [userLoading, setUserLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<CinquentaKgDepoisSessionPayload | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUserLoading(false);
      if (!u) {
        router.replace(cinquentaKgDepoisAcessarUrl(`/metaadmingeral/50kg-depois/${participantId}`));
        return;
      }
      setAuthorized(true);
    });
    return () => unsub();
  }, [router, participantId]);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await cinquentaKgDepoisAuthFetch(
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
    if (!authorized || !participantId) return;
    void loadSession();
  }, [authorized, participantId, loadSession]);

  if (userLoading || !authorized) {
    return <MetaAdminGeralLoadingScreen />;
  }

  return (
    <div className={`${META_ADMIN_GERAL_SHELL.page} min-h-screen`}>
      <header className="shrink-0 border-b border-white/10 px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
        <button
          type="button"
          onClick={() => router.push('/metaadmingeral/50kg-depois')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          50 KG DEPOIS
        </button>
        <span className="text-xs text-[#E8EDED]/50">
          MetaAdminGeral · {META_ADMIN_GERAL_BRANDING.productName}
        </span>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center gap-2 text-[#E8EDED]/70 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando respostas...
          </div>
        ) : error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : session ? (
          <CinquentaKgDepoisResponsesPanel session={session} variant="dark" />
        ) : null}
      </main>
    </div>
  );
}
