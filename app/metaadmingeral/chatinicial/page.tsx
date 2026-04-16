'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import ModalDadosPacienteChat, {
  META_CHAT_INTRO_SESSION_KEY,
  META_CHAT_INTRO_SANDBOX_SESSION_KEY,
} from '@/components/ModalDadosPacienteChat';
import {
  createMetaChatSandboxPacienteVazio,
  createMetaChatSandboxPacienteAteMetas,
} from '@/lib/chat/metaChatSandboxPaciente';
import type { PacienteCompleto } from '@/types/obesidade';
import { ArrowLeft, RefreshCw, FastForward } from 'lucide-react';

const METAADMIN_GERAL_EMAIL = 'ricpmota.med@gmail.com';

export default function MetaAdminGeralChatInicialPage() {
  const router = useRouter();
  const [userLoading, setUserLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [paciente, setPaciente] = useState<PacienteCompleto>(createMetaChatSandboxPacienteVazio);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUserLoading(false);
      if (!u) {
        router.replace('/');
        return;
      }
      if (u.email !== METAADMIN_GERAL_EMAIL) {
        router.replace('/meta');
        return;
      }
      setUserEmail(u.email);
    });
    return () => unsub();
  }, [router]);

  const reiniciarFluxoCompleto = useCallback(() => {
    try {
      sessionStorage.removeItem(META_CHAT_INTRO_SESSION_KEY);
      sessionStorage.removeItem(META_CHAT_INTRO_SANDBOX_SESSION_KEY);
    } catch {
      /* ignore */
    }
    setPaciente(createMetaChatSandboxPacienteVazio());
    setResetKey((k) => k + 1);
  }, []);

  const irDiretoParaMetas = useCallback(() => {
    try {
      sessionStorage.setItem(META_CHAT_INTRO_SANDBOX_SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
    setPaciente(createMetaChatSandboxPacienteAteMetas());
    setResetKey((k) => k + 1);
  }, []);

  if (userLoading || !userEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A1F44]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4CCB7A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1F44] flex flex-col text-[#E8EDED]">
      <header className="shrink-0 border-b border-white/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.push('/metaadmingeral')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Meta Admin Geral
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">Chat inicial (preview /meta)</h1>
            <p className="text-xs text-[#E8EDED]/70 truncate">
              Espelho do modal &quot;Completar dados&quot; — ajuste o fluxo sem criar paciente novo.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reiniciarFluxoCompleto}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Reiniciar do zero
          </button>
          <button
            type="button"
            onClick={irDiretoParaMetas}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#4CCB7A]/25 hover:bg-[#4CCB7A]/35 text-sm text-[#4CCB7A]"
          >
            <FastForward className="w-4 h-4" />
            Pular até metas
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 p-4 flex justify-center">
        <div className="w-full max-w-lg flex flex-col min-h-0">
          <ModalDadosPacienteChat
            key={resetKey}
            paciente={paciente}
            setPaciente={setPaciente}
            embedded
            sandboxBanner
            chatTitle="Chat inicial (preview)"
            chatSubtitle="Mesmo fluxo do /meta"
            onClose={() => router.push('/metaadmingeral')}
            onSave={async () => {
              /* Preview: não grava em pacientes_completos */
            }}
            saving={saving}
            setSaving={setSaving}
          />
        </div>
      </main>
    </div>
  );
}
