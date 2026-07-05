'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import ModalDadosPacienteChat, {
  META_CHAT_INTRO_SESSION_KEY,
  META_CHAT_INTRO_SANDBOX_SESSION_KEY,
} from '@/components/ModalDadosPacienteChat';
import MetaPacienteWizard from '@/components/meta/MetaPacienteWizard';
import { ModalRecomendacoesPaciente } from '@/components/meta/ModalRecomendacoesPaciente';
import {
  createMetaChatSandboxPacienteVazio,
  createMetaChatSandboxPacienteAteMetas,
} from '@/lib/chat/metaChatSandboxPaciente';
import type { PacienteCompleto } from '@/types/obesidade';
import { MedicoService } from '@/services/medicoService';
import { resolveMedicoWhiteLabel, type MedicoWhiteLabelResolved } from '@/lib/whiteLabel/resolveMedicoWhiteLabel';
import { ArrowLeft, BookOpen, ExternalLink, FastForward, RefreshCw } from 'lucide-react';

import { METAADMIN_GERAL_EMAIL } from '@/lib/meta/anamneseInteligenteGate';
import { metaAdminGeralAcessarUrl } from '@/lib/metaadmin/metaAdminGeralLogin';
import { META_ADMIN_GERAL_BRANDING, META_ADMIN_GERAL_SHELL } from '@/lib/metaadmin/metaAdminGeralBranding';
import { MetaAdminGeralLoadingScreen } from '@/components/metaadmingeral/MetaAdminGeralBrandMark';

export default function MetaAdminGeralChatInicialPage() {
  const router = useRouter();
  const [userLoading, setUserLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [previewMode, setPreviewMode] = useState<'wizard' | 'chat'>('wizard');
  const [paciente, setPaciente] = useState<PacienteCompleto>(createMetaChatSandboxPacienteVazio);
  const [saving, setSaving] = useState(false);
  const [previewRecomendacoesObrigatorias, setPreviewRecomendacoesObrigatorias] = useState(true);
  const [showRecomendacoesPortal, setShowRecomendacoesPortal] = useState(false);
  const [portalRecomendacoesObrigatorias, setPortalRecomendacoesObrigatorias] = useState(false);
  const [recomendacoesPreviewKey, setRecomendacoesPreviewKey] = useState(0);
  const [previewWhiteLabel, setPreviewWhiteLabel] = useState<MedicoWhiteLabelResolved | null>(null);

  useEffect(() => {
    let cancelled = false;
    MedicoService.getAllMedicos()
      .then((list) => {
        if (cancelled) return;
        const comLogo =
          list.find((m) => m.whiteLabel?.aplicacaoPageLogoUrl?.trim()) ||
          list.find((m) => m.whiteLabel?.publicPageLogoUrl?.trim()) ||
          list[0];
        if (comLogo) {
          setPreviewWhiteLabel(
            resolveMedicoWhiteLabel({
              nome: comLogo.nome,
              genero: comLogo.genero,
              fotoPerfilUrl: comLogo.fotoPerfilUrl,
              whiteLabel: comLogo.whiteLabel,
            })
          );
        }
      })
      .catch(() => {
        if (!cancelled) setPreviewWhiteLabel(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUserLoading(false);
      if (!u) {
        router.replace(metaAdminGeralAcessarUrl('/metaadmingeral/chatinicial'));
        return;
      }
      if (u.email?.trim().toLowerCase() !== METAADMIN_GERAL_EMAIL.trim().toLowerCase()) {
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

  const abrirRecomendacoesFullscreen = useCallback((obrigatorias: boolean) => {
    setPortalRecomendacoesObrigatorias(obrigatorias);
    setShowRecomendacoesPortal(true);
  }, []);

  if (userLoading || !userEmail) {
    return <MetaAdminGeralLoadingScreen />;
  }

  return (
    <div className={`${META_ADMIN_GERAL_SHELL.page} flex flex-col`}>
      <header className="shrink-0 border-b border-white/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.push('/metaadmingeral')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            MetaAdminGeral · {META_ADMIN_GERAL_BRANDING.productName}
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">Chat inicial (preview /meta)</h1>
            <p className="text-xs text-[#E8EDED]/70 truncate">
              Chat + recomendações lado a lado — mesmo visual do paciente em /meta.
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
          <div className="inline-flex rounded-lg border border-white/15 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setPreviewMode('wizard')}
              className={`px-3 py-2 ${previewMode === 'wizard' ? 'bg-[#4CCB7A]/25 text-[#4CCB7A]' : 'bg-white/10 text-[#E8EDED]/70 hover:bg-white/15'}`}
            >
              Wizard (novo)
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('chat')}
              className={`px-3 py-2 ${previewMode === 'chat' ? 'bg-[#4CCB7A]/25 text-[#4CCB7A]' : 'bg-white/10 text-[#E8EDED]/70 hover:bg-white/15'}`}
            >
              Chat (legado)
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 p-4">
        <div className="mx-auto w-full max-w-6xl h-[calc(100dvh-8.5rem)] min-h-[480px] grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chat inicial */}
          <section className="flex flex-col min-h-0 rounded-2xl border border-white/10 bg-[#0A1F44]/60 overflow-hidden">
            <div className="shrink-0 px-3 py-2 border-b border-white/10 text-xs font-medium text-[#E8EDED]/70">
              {previewMode === 'wizard' ? 'Completar dados (wizard — etapa 5)' : 'Completar dados (chat legado)'}
            </div>
            <div className="flex-1 min-h-0 p-3 flex justify-center">
              <div className="w-full max-w-lg flex flex-col min-h-0 h-full">
                {previewMode === 'wizard' ? (
                  <MetaPacienteWizard
                    key={`wizard-${resetKey}`}
                    paciente={paciente}
                    setPaciente={setPaciente}
                    embedded
                    sandboxBanner
                    headerWhiteLabel={previewWhiteLabel}
                    onClose={() => router.push('/metaadmingeral')}
                    onSave={async () => {
                      /* Preview: não grava em pacientes_completos */
                    }}
                    saving={saving}
                    setSaving={setSaving}
                  />
                ) : (
                  <ModalDadosPacienteChat
                    key={`chat-${resetKey}`}
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
                )}
              </div>
            </div>
          </section>

          {/* Recomendações — espelho do /meta */}
          <section className="flex flex-col min-h-0 rounded-2xl border border-white/10 bg-[#0A1F44]/60 overflow-hidden">
            <div className="shrink-0 px-3 py-2 border-b border-white/10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="w-4 h-4 shrink-0 text-[#4CCB7A]" />
                <span className="text-xs font-medium text-[#E8EDED]/85 truncate">
                  Recomendações (preview /meta)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewRecomendacoesObrigatorias(false);
                    setRecomendacoesPreviewKey((k) => k + 1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    !previewRecomendacoesObrigatorias
                      ? 'bg-[#4CCB7A]/25 text-[#4CCB7A]'
                      : 'bg-white/10 text-[#E8EDED]/70 hover:bg-white/15'
                  }`}
                >
                  Modo livre
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewRecomendacoesObrigatorias(true);
                    setRecomendacoesPreviewKey((k) => k + 1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    previewRecomendacoesObrigatorias
                      ? 'bg-amber-400/20 text-amber-100'
                      : 'bg-white/10 text-[#E8EDED]/70 hover:bg-white/15'
                  }`}
                >
                  Modo obrigatório
                </button>
                <button
                  type="button"
                  onClick={() => abrirRecomendacoesFullscreen(previewRecomendacoesObrigatorias)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-medium"
                  title="Abre em tela cheia como no /meta (mesmo modo selecionado ao lado)"
                >
                  <ExternalLink className="w-3 h-3" />
                  Tela cheia
                </button>
              </div>
            </div>
            <p className="shrink-0 px-3 py-1.5 text-[10px] text-[#E8EDED]/55 border-b border-white/5">
              Painel ao lado: edições em{' '}
              <code className="text-[#4CCB7A]/90">components/meta/ModalRecomendacoesPaciente.tsx</code>{' '}
              refletem no /meta.
            </p>
            <div className="flex-1 min-h-0 p-2">
              <ModalRecomendacoesPaciente
                key={`${recomendacoesPreviewKey}-${previewRecomendacoesObrigatorias ? 'obr' : 'livre'}`}
                variant="embedded"
                obrigatorias={previewRecomendacoesObrigatorias}
                onClose={() => {}}
                onConcluirLeitura={async () => {
                  alert(
                    'Preview: no /meta aqui registraria consentimento (etapa aplicacao) em Firestore, marcaria recomendacoesLidas e enviaria e-mail ao médico.'
                  );
                }}
              />
            </div>
          </section>
        </div>
      </main>

      <ModalRecomendacoesPaciente
        variant="portal"
        open={showRecomendacoesPortal}
        obrigatorias={portalRecomendacoesObrigatorias}
        onClose={() => setShowRecomendacoesPortal(false)}
        onConcluirLeitura={async () => {
          alert('Preview: leitura obrigatória concluída (sem gravar no Firestore).');
        }}
      />
    </div>
  );
}
