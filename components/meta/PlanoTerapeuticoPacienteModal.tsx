'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ClipboardList, ExternalLink, FileSignature, Loader2, X } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import type { PlanoTerapeuticoInterativoDocumento } from '@/types/planoTerapeuticoInterativo';
import { subscribePlanoTerapeuticoPendentePaciente } from '@/lib/metaadmin/planoTerapeuticoService';
import { formatarMoedaBRL } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import { planoPacienteJaAssinou } from '@/lib/planoTerapeutico/planoTerapeuticoStatusUi';
import { abrirPropostaPlanoPacienteMeta } from '@/lib/planoTerapeutico/abrirPropostaPlanoPacienteMeta';
import { auth } from '@/lib/firebase';

export type PlanoTerapeuticoPacienteModalProps = {
  open: boolean;
  onClose: () => void;
  paciente: PacienteCompleto;
  plano: PlanoTerapeuticoInterativoDocumento | null;
  obrigatorio?: boolean;
  onPlanoAtualizado?: (plano: PlanoTerapeuticoInterativoDocumento | null) => void;
};

function abrirUrlExterna(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function PlanoTerapeuticoPacienteModal({
  open,
  onClose,
  paciente,
  plano,
  obrigatorio = false,
  onPlanoAtualizado,
}: PlanoTerapeuticoPacienteModalProps) {
  const [publicUrl, setPublicUrl] = useState<string | null>(plano?.publicUrl ?? null);
  const [carregandoUrl, setCarregandoUrl] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarAcesso = useCallback(async () => {
    if (!paciente.id) return null;
    const user = auth.currentUser;
    if (!user) return null;

    setCarregandoUrl(true);
    setErro(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/meta/plano-terapeutico/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pacienteId: paciente.id }),
      });
      const data = (await res.json()) as { ok?: boolean; publicUrl?: string; error?: string };
      if (!res.ok || !data.ok || !data.publicUrl) {
        setErro(data.error || 'Não foi possível abrir o plano.');
        return null;
      }
      setPublicUrl(data.publicUrl);
      return data.publicUrl;
    } catch {
      setErro('Falha de conexão ao carregar o plano.');
      return null;
    } finally {
      setCarregandoUrl(false);
    }
  }, [paciente.id]);

  useEffect(() => {
    if (!open) return;
    setPublicUrl(plano?.publicUrl ?? null);
    if (!plano?.publicUrl) {
      void carregarAcesso();
    }
  }, [open, plano?.publicUrl, carregarAcesso]);

  useEffect(() => {
    if (!open || !paciente.id) return;
    return subscribePlanoTerapeuticoPendentePaciente(paciente.id, (doc) => {
      onPlanoAtualizado?.(doc);
      if (doc?.publicUrl) setPublicUrl(doc.publicUrl);
    });
  }, [open, paciente.id, onPlanoAtualizado]);

  if (!open || typeof window === 'undefined') return null;

  const assinado = planoPacienteJaAssinou(plano);
  const bloquearFechar = obrigatorio && !assinado;

  const handleAbrirPlano = async () => {
    if (assinado) {
      const result = await abrirPropostaPlanoPacienteMeta({
        pacienteId: paciente.id,
        plano,
      });
      if (!result.ok) setErro(result.error);
      return;
    }
    const url = publicUrl?.trim() || (await carregarAcesso());
    if (url) abrirUrlExterna(url);
  };

  const content = (
    <div
      className="fixed inset-0 z-[99995] flex flex-col bg-gradient-to-b from-[#06152e] via-[#0A1F44] to-[#0d2a5a] text-[#E8EDED]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plano-paciente-modal-titulo"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 bg-[#0A1F44]/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#4CCB7A]/40 bg-[#4CCB7A]/10 text-[#4CCB7A]">
            <ClipboardList className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="plano-paciente-modal-titulo" className="text-lg font-bold leading-tight sm:text-xl">
              Plano Terapêutico
            </h2>
            <p className="mt-0.5 text-xs text-[#E8EDED]/65 sm:text-sm">
              Escolha o plano e assine para confirmar o tratamento.
            </p>
          </div>
        </div>
        {!bloquearFechar && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-white/15 p-2.5 text-[#E8EDED] transition-colors hover:bg-white/10"
            aria-label="Fechar plano terapêutico"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-4">
          {plano?.escolhaPaciente ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#E8EDED]/60">
                Sua escolha registrada
              </p>
              <p className="text-base font-semibold">{plano.escolhaPaciente.rotuloExibicao}</p>
              <p className="text-sm text-[#E8EDED]/80">
                {formatarMoedaBRL(plano.escolhaPaciente.valorTotal)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[#E8EDED]/80 leading-relaxed">
              Abra a página do plano para comparar as modalidades com seu médico e escolher a opção
              ideal.
            </p>
          )}

          {erro ? (
            <p className="text-sm text-red-300 bg-red-950/40 border border-red-400/30 rounded-lg px-3 py-2">
              {erro}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleAbrirPlano()}
            disabled={carregandoUrl}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#4CCB7A] px-4 py-3.5 text-sm font-semibold text-[#0A1F44] transition-opacity hover:opacity-95 disabled:opacity-60"
          >
            {carregandoUrl ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ExternalLink className="h-4 w-4" aria-hidden />
            )}
            {carregandoUrl ? 'Preparando…' : assinado ? 'Ver proposta assinada' : 'Abrir e assinar plano'}
          </button>

          <div className="flex items-start gap-2 text-xs text-[#E8EDED]/65">
            <FileSignature className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
            <p>
              Confirme o plano na página — um PDF com o resumo da sua escolha será gerado
              automaticamente, sem precisar digitar seu nome.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
