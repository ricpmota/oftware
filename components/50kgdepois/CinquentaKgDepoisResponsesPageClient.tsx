'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import CinquentaKgDepoisResponsesPanel from '@/components/50kgdepois/CinquentaKgDepoisResponsesPanel';
import { auth } from '@/lib/firebase';
import { CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT } from '@/lib/50kgdepois/constants';
import { cinquentaKgDepoisAuthFetch } from '@/lib/50kgdepois/clientAuthFetch';
import { cinquentaKgDepoisAcessarUrl } from '@/lib/50kgdepois/cinquentaKgDepoisLogin';
import type { CinquentaKgDepoisSessionPayload } from '@/types/cinquentaKgDepois';

export default function CinquentaKgDepoisResponsesPageClient() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<CinquentaKgDepoisSessionPayload | null>(null);
  const [error, setError] = useState('');

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await cinquentaKgDepoisAuthFetch(
        `/api/50kgdepois/load?participantId=${encodeURIComponent(CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT.id)}`
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
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthLoading(false);
      if (!user) {
        router.replace(cinquentaKgDepoisAcessarUrl('/50kgdepois/respostas'));
        return;
      }
      void loadSession();
    });
    return () => unsub();
  }, [router, loadSession]);

  if (authLoading || loading) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">50 KG DEPOIS</p>
            <h1 className="text-lg font-bold text-slate-900">Respostas da entrevista</h1>
          </div>
          <Link
            href="/50kgdepois"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800 whitespace-nowrap"
          >
            Contar minha história
          </Link>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : session ? (
          <CinquentaKgDepoisResponsesPanel session={session} variant="light" />
        ) : null}
      </main>
    </div>
  );
}
