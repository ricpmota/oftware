'use client';

import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useState } from 'react';

export default function MentoradosAccessGate({
  variant,
}: {
  variant: 'login' | 'unverified';
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
      setError('Não foi possível entrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Central do Mentorado</h1>
      {variant === 'unverified' ? (
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
          Esta área é exclusiva para médicos verificados da plataforma.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
            Entre com a conta do médico para acessar os treinamentos oficiais da Oftware.
          </p>
          {error ? <p className="mt-3 text-sm text-[var(--state-danger)]">{error}</p> : null}
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleLogin()}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand-primary)] px-5 text-sm font-semibold text-[var(--text-inverse)] disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar com Google'}
          </button>
        </>
      )}
    </div>
  );
}
