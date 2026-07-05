'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import {
  sanitizeAppNextPath,
  sanitizeLoginNextPath,
  type AppAccessPath,
} from '@/lib/landing/appNavigation';

const DEEP_BLUE = '#0A1F44';

const AREA_LABELS: Record<AppAccessPath, string> = {
  '/meta': 'Paciente',
  '/metaadmin': 'Médico',
  '/metanutri': 'Nutricionista',
  '/metapersonal': 'Personal',
};

export default function AcessarPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    const raw = searchParams.get('next');
    return sanitizeLoginNextPath(raw) ?? sanitizeAppNextPath(raw) ?? '/meta';
  }, [searchParams]);

  const pathOnly = nextPath.split('?')[0] ?? '/meta';
  const areaLabel =
    pathOnly === '/metaadmingeral' || pathOnly.startsWith('/metaadmingeral/')
      ? 'Administração Geral'
      : AREA_LABELS[(pathOnly as AppAccessPath) ?? '/meta'];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace(nextPath);
        return;
      }
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, [nextPath, router]);

  const handleGoogleLogin = async () => {
    if (isLoggingIn) return;
    try {
      setIsLoggingIn(true);
      setLoginError(null);
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      router.replace(nextPath);
    } catch (error: unknown) {
      const errorCode = (error as { code?: string }).code;
      if (errorCode === 'auth/popup-closed-by-user') setLoginError('Login cancelado.');
      else if (errorCode === 'auth/popup-blocked') setLoginError('Popup bloqueado. Permita popups neste site.');
      else if (errorCode === 'auth/unauthorized-domain') {
        setLoginError('Domínio não autorizado no Firebase. Contate o suporte.');
      } else setLoginError('Erro ao fazer login. Tente novamente.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: DEEP_BLUE }}>
        <Loader2 className="h-8 w-8 animate-spin text-[#4CCB7A]" aria-hidden />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: DEEP_BLUE }}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-xl">
        <img src="/oftware2.png" alt="Oftware" className="mx-auto mb-6 h-10 w-auto object-contain" />
        <h1 className="text-xl font-semibold text-[#E8EDED] mb-2">Entrar na plataforma</h1>
        <p className="text-sm text-[#E8EDED]/75 mb-8">
          Área do <span className="text-[#4CCB7A] font-medium">{areaLabel}</span> — login seguro em{' '}
          <span className="whitespace-nowrap">oftware.com.br</span>
        </p>
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoggingIn}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#0A1F44] transition hover:bg-[#E8EDED] disabled:opacity-60"
        >
          {isLoggingIn ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          Continuar com Google
        </button>
        {loginError ? <p className="mt-4 text-sm text-red-300">{loginError}</p> : null}
      </div>
    </div>
  );
}
