'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, FileSignature, Loader2, X } from 'lucide-react';
import type { ContratoTratamentoDocumentoRecord } from '@/lib/documentos/contrato-tratamento/contratoTratamentoTypes';
import type { Medico } from '@/types/medico';
import type { PacienteCompleto } from '@/types/obesidade';
import ContratoPacienteResumo from '@/components/meta/ContratoPacienteResumo';
import ContratoPacienteStatusBadge from '@/components/meta/ContratoPacienteStatusBadge';
import ContratoPacienteTextoLeitura from '@/components/meta/ContratoPacienteTextoLeitura';
import ContratoPacienteOpcaoEntregaModal from '@/components/meta/ContratoPacienteOpcaoEntregaModal';
import type { ContratoOpcaoEntregaMaterial } from '@/lib/contratos/contratoOpcaoEntregaMaterial';
import { requestContratoPacienteEnsureSignLink } from '@/lib/signature/requestContratoPacienteEnsureSignLink';
import { requestContratoPacienteSaveOpcaoEntrega } from '@/lib/signature/requestContratoPacienteSaveOpcaoEntrega';
import { requestContratoPacienteSyncSignStatus } from '@/lib/signature/requestContratoPacienteSyncSignStatus';
import { contratoPacienteAssinaturaPendente } from '@/lib/documentos/contrato-tratamento/contratoTratamentoPacienteDisponibilidade';
import {
  contratoPacienteJaAssinou,
  normalizarStatusAssinaturaPaciente,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoFluxoAssinatura';

const SYNC_POLL_MS = 4000;

export type ContratoPacienteModalProps = {
  open: boolean;
  onClose: () => void;
  contrato: ContratoTratamentoDocumentoRecord;
  paciente: PacienteCompleto;
  medico: Medico | null;
  /** Bloqueia fechar até a assinatura do paciente estar concluída. */
  obrigatorio?: boolean;
  onContratoAtualizado?: (contrato: ContratoTratamentoDocumentoRecord) => void;
  onPacienteIdResolved?: (pacienteId: string) => void;
};

function abrirUrlExterna(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function urlPdfFinal(contrato: ContratoTratamentoDocumentoRecord): string | null {
  return (
    contrato.pdfFinalAssinadoUrl?.trim() ||
    contrato.pdfAssinadoMedicoUrl?.trim() ||
    contrato.pdfUrl?.trim() ||
    null
  );
}

function contratoAttemptKey(pacienteId: string, contratoId: string): string {
  return `${pacienteId}:${contratoId}`;
}

export default function ContratoPacienteModal({
  open,
  onClose,
  contrato,
  paciente,
  medico,
  obrigatorio = false,
  onContratoAtualizado,
  onPacienteIdResolved,
}: ContratoPacienteModalProps) {
  const [signLinkUrl, setSignLinkUrl] = useState<string | null>(
    contrato.pacienteSignLinkUrl?.trim() || null
  );
  const [opcaoEntregaMaterial, setOpcaoEntregaMaterial] = useState<
    ContratoOpcaoEntregaMaterial | null
  >(contrato.opcaoEntregaMaterial ?? null);
  const [modalOpcaoAberto, setModalOpcaoAberto] = useState(false);
  const [salvandoOpcao, setSalvandoOpcao] = useState(false);
  const [preparandoAssinatura, setPreparandoAssinatura] = useState(false);
  const [sincronizandoAssinatura, setSincronizandoAssinatura] = useState(false);
  const [erroAssinatura, setErroAssinatura] = useState<string | null>(null);
  const autoEnsureKeyRef = useRef<string | null>(null);
  const ensureInFlightRef = useRef(false);
  const syncInFlightRef = useRef(false);
  const aguardandoRetornoAssinaturaRef = useRef(false);

  const aplicarContratoSincronizado = useCallback(
    (result: {
      statusAssinatura: 'aguardando_medico' | 'assinado_completo';
      pdfFinalAssinadoUrl: string;
      pacienteAssinadoEm: string;
      resolvedPacienteId?: string;
      resolvedDocumentoId?: string;
    }) => {
      if (result.resolvedPacienteId) {
        onPacienteIdResolved?.(result.resolvedPacienteId);
      }
      const contratoAtualizado: ContratoTratamentoDocumentoRecord = {
        ...contrato,
        ...(result.resolvedDocumentoId ? { id: result.resolvedDocumentoId } : {}),
        statusAssinatura: result.statusAssinatura,
        pacienteSignStatus: 'assinado',
        pdfFinalAssinadoUrl: result.pdfFinalAssinadoUrl,
        pacienteAssinadoEm: new Date(result.pacienteAssinadoEm),
      };
      onContratoAtualizado?.(contratoAtualizado);
      aguardandoRetornoAssinaturaRef.current = false;
    },
    [contrato, onContratoAtualizado, onPacienteIdResolved]
  );

  const sincronizarAssinatura = useCallback(async (): Promise<boolean> => {
    if (contratoPacienteJaAssinou(contrato) || !contrato.id) {
      return true;
    }
    if (syncInFlightRef.current) return false;

    syncInFlightRef.current = true;
    setSincronizandoAssinatura(true);
    try {
      const result = await requestContratoPacienteSyncSignStatus({
        pacienteId: paciente.id,
        documentoId: contrato.id,
      });
      if (result.pending) return false;
      aplicarContratoSincronizado(result);
      return true;
    } catch {
      return false;
    } finally {
      syncInFlightRef.current = false;
      setSincronizandoAssinatura(false);
    }
  }, [aplicarContratoSincronizado, contrato, paciente.id]);

  const sincronizarAssinaturaRef = useRef(sincronizarAssinatura);
  sincronizarAssinaturaRef.current = sincronizarAssinatura;

  const garantirLinkAssinatura = useCallback(
    async (options?: { manual?: boolean }) => {
      const existente = contrato.pacienteSignLinkUrl?.trim();
      if (existente) {
        setSignLinkUrl(existente);
        return existente;
      }
      if (contrato.statusAssinatura !== 'aguardando_paciente' || !contrato.id) return null;

      if (ensureInFlightRef.current) return null;

      setPreparandoAssinatura(true);
      setErroAssinatura(null);
      ensureInFlightRef.current = true;
      try {
        const result = await requestContratoPacienteEnsureSignLink({
          pacienteId: paciente.id,
          documentoId: contrato.id,
        });
        if (result.resolvedPacienteId) {
          onPacienteIdResolved?.(result.resolvedPacienteId);
        }
        const contratoAtualizado: ContratoTratamentoDocumentoRecord = {
          ...contrato,
          ...(result.resolvedDocumentoId ? { id: result.resolvedDocumentoId } : {}),
          pacienteSignLinkUrl: result.pacienteSignLinkUrl,
          pacienteSignStatus: 'link_gerado',
        };
        setSignLinkUrl(result.pacienteSignLinkUrl);
        onContratoAtualizado?.(contratoAtualizado);
        autoEnsureKeyRef.current = contratoAttemptKey(
          result.resolvedPacienteId || paciente.id,
          result.resolvedDocumentoId || contrato.id
        );
        return result.pacienteSignLinkUrl;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Não foi possível abrir a assinatura.';
        setErroAssinatura(msg);
        if (!options?.manual) {
          autoEnsureKeyRef.current = contratoAttemptKey(paciente.id, contrato.id);
        }
        return null;
      } finally {
        ensureInFlightRef.current = false;
        setPreparandoAssinatura(false);
      }
    },
    [contrato, paciente.id, onContratoAtualizado, onPacienteIdResolved]
  );

  const garantirLinkRef = useRef(garantirLinkAssinatura);
  garantirLinkRef.current = garantirLinkAssinatura;

  useEffect(() => {
    if (!open) {
      autoEnsureKeyRef.current = null;
      ensureInFlightRef.current = false;
      return;
    }

    setSignLinkUrl(contrato.pacienteSignLinkUrl?.trim() || null);
    setOpcaoEntregaMaterial(contrato.opcaoEntregaMaterial ?? null);
    if (!open) {
      setModalOpcaoAberto(false);
    }

    const key = contratoAttemptKey(paciente.id, contrato.id);
    const linkExistente = contrato.pacienteSignLinkUrl?.trim();
    if (linkExistente) {
      autoEnsureKeyRef.current = key;
      return;
    }

    if (contrato.statusAssinatura !== 'aguardando_paciente' || !contrato.id) return;
    if (!contrato.opcaoEntregaMaterial) return;
    if (autoEnsureKeyRef.current === key) return;

    autoEnsureKeyRef.current = key;
    void garantirLinkRef.current();
  }, [open, paciente.id, contrato.id, contrato.pacienteSignLinkUrl, contrato.statusAssinatura, contrato.opcaoEntregaMaterial]);

  useEffect(() => {
    if (!open || contratoPacienteAssinaturaPendente(contrato) === false || !contrato.id) return;
    const shouldPoll =
      aguardandoRetornoAssinaturaRef.current || Boolean(contrato.pacienteSignLinkUrl?.trim());
    if (!shouldPoll) return;

    void sincronizarAssinaturaRef.current();

    const onFocus = () => {
      if (aguardandoRetornoAssinaturaRef.current) {
        void sincronizarAssinaturaRef.current();
      }
    };
    const onVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        aguardandoRetornoAssinaturaRef.current
      ) {
        void sincronizarAssinaturaRef.current();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    const intervalId = window.setInterval(() => {
      if (
        aguardandoRetornoAssinaturaRef.current ||
        contrato.pacienteSignLinkUrl?.trim()
      ) {
        void sincronizarAssinaturaRef.current();
      }
    }, SYNC_POLL_MS);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(intervalId);
    };
  }, [open, contrato, contrato.id, contrato.pacienteSignLinkUrl]);

  if (!open || typeof window === 'undefined') return null;

  const status = normalizarStatusAssinaturaPaciente(contrato.statusAssinatura, contrato);
  const pdfFinal = urlPdfFinal(contrato);
  const bloquearFechar = obrigatorio && contratoPacienteAssinaturaPendente(contrato);
  const pacienteJaAssinou = contratoPacienteJaAssinou(contrato);

  const handleFechar = () => {
    if (bloquearFechar) return;
    onClose();
  };

  const handleAssinar = async () => {
    if (!opcaoEntregaMaterial && !contrato.opcaoEntregaMaterial) {
      setModalOpcaoAberto(true);
      return;
    }
    const link = signLinkUrl?.trim() || (await garantirLinkAssinatura({ manual: true }));
    if (link) {
      aguardandoRetornoAssinaturaRef.current = true;
      abrirUrlExterna(link);
      void sincronizarAssinaturaRef.current();
    }
  };

  const handleConfirmarOpcao = async (opcao: ContratoOpcaoEntregaMaterial) => {
    if (!contrato.id) return;
    setSalvandoOpcao(true);
    setErroAssinatura(null);
    try {
      await requestContratoPacienteSaveOpcaoEntrega({
        pacienteId: paciente.id,
        documentoId: contrato.id,
        opcaoEntregaMaterial: opcao,
      });
      setOpcaoEntregaMaterial(opcao);
      const contratoComOpcao: ContratoTratamentoDocumentoRecord = {
        ...contrato,
        opcaoEntregaMaterial: opcao,
        opcaoEntregaMaterialEm: new Date(),
      };
      onContratoAtualizado?.(contratoComOpcao);
      setModalOpcaoAberto(false);

      const link = signLinkUrl?.trim() || (await garantirLinkAssinatura({ manual: true }));
      if (link) {
        aguardandoRetornoAssinaturaRef.current = true;
        abrirUrlExterna(link);
        void sincronizarAssinaturaRef.current();
      }
    } catch (e) {
      setErroAssinatura(e instanceof Error ? e.message : 'Não foi possível salvar sua escolha.');
    } finally {
      setSalvandoOpcao(false);
    }
  };

  const content = (
    <div
      className="fixed inset-0 z-[99996] flex flex-col bg-gradient-to-b from-[#06152e] via-[#0A1F44] to-[#0d2a5a] text-[#E8EDED]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contrato-paciente-modal-titulo"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 bg-[#0A1F44]/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#4CCB7A]/40 bg-[#4CCB7A]/10 text-[#4CCB7A]">
            <FileSignature className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="contrato-paciente-modal-titulo" className="text-lg font-bold leading-tight sm:text-xl">
              Contrato de Tratamento
            </h2>
            <p className="mt-0.5 text-xs text-[#E8EDED]/65 sm:text-sm">
              Documento disponibilizado pelo seu médico.
            </p>
          </div>
        </div>
        {!bloquearFechar && (
          <button
            type="button"
            onClick={handleFechar}
            className="shrink-0 rounded-xl border border-white/15 p-2.5 text-[#E8EDED] transition-colors hover:bg-white/10"
            aria-label="Fechar contrato"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <ContratoPacienteStatusBadge status={status} />
          </div>

          {status === 'aguardando_paciente' && (
            <div className="space-y-2">
              <p className="text-base font-semibold text-amber-200">🟡 Assinatura pendente</p>
              <p className="text-sm leading-relaxed text-[#E8EDED]/80">
                Seu médico solicitou a assinatura deste contrato. Leia o documento, escolha como
                deseja receber o tratamento e conclua sua assinatura.
              </p>
              {obrigatorio && !pacienteJaAssinou && (
                <p className="text-xs leading-relaxed text-amber-100/80">
                  É necessário assinar o contrato para continuar usando o portal.
                </p>
              )}
              {sincronizandoAssinatura && (
                <p className="text-xs text-[#E8EDED]/60 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Verificando se sua assinatura foi concluída…
                </p>
              )}
            </div>
          )}

          {status === 'aguardando_medico' && (
            <div className="space-y-2">
              <p className="text-base font-semibold text-[#4CCB7A]">🟢 Contrato assinado</p>
              <p className="text-sm leading-relaxed text-[#E8EDED]/80">
                Sua assinatura foi registrada. Você já pode usar o portal normalmente e baixar seu
                contrato. A assinatura do médico será concluída em seguida.
              </p>
            </div>
          )}

          {status === 'assinado_completo' && (
            <div className="space-y-2">
              <p className="text-base font-semibold text-[#4CCB7A]">🟢 Contrato assinado</p>
              <p className="text-sm leading-relaxed text-[#E8EDED]/80">
                Este contrato já foi assinado pelo médico e pelo paciente.
              </p>
            </div>
          )}

          <ContratoPacienteResumo />

          {status === 'aguardando_paciente' ? (
            <ContratoPacienteTextoLeitura
              paciente={paciente}
              medico={medico}
              contrato={{
                ...contrato,
                opcaoEntregaMaterial: opcaoEntregaMaterial ?? contrato.opcaoEntregaMaterial,
              }}
            />
          ) : null}

          {(status === 'aguardando_medico' || status === 'assinado_completo') && pdfFinal && (
            <button
              type="button"
              onClick={() => abrirUrlExterna(pdfFinal)}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-[#E8EDED]/85 transition-colors hover:bg-white/10"
            >
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
              {status === 'aguardando_medico'
                ? 'Baixar contrato assinado por você'
                : 'Abrir contrato final assinado'}
            </button>
          )}

          {erroAssinatura && status === 'aguardando_paciente' && (
            <p className="text-sm text-red-200/90 bg-red-500/10 border border-red-400/25 rounded-xl px-3 py-2">
              {erroAssinatura}
            </p>
          )}
        </div>
      </div>

      {status === 'aguardando_paciente' && (
        <footer className="shrink-0 border-t border-white/10 bg-[#0A1F44]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <div className="mx-auto w-full max-w-2xl">
            <button
              type="button"
              onClick={() => void handleAssinar()}
              disabled={preparandoAssinatura || sincronizandoAssinatura || salvandoOpcao}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#4CCB7A] px-4 text-base font-semibold text-[#0A1F44] transition-colors hover:bg-[#45b86d] disabled:cursor-wait disabled:opacity-80"
            >
              {(preparandoAssinatura || salvandoOpcao) ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
              ) : (
                <FileSignature className="h-5 w-5 shrink-0" aria-hidden />
              )}
              {preparandoAssinatura || salvandoOpcao
                ? salvandoOpcao
                  ? 'Gerando contrato…'
                  : 'Preparando assinatura…'
                : 'Assinar contrato'}
            </button>
          </div>
        </footer>
      )}

      {(status === 'aguardando_medico' || status === 'assinado_completo') && pdfFinal && (
        <footer className="shrink-0 border-t border-white/10 bg-[#0A1F44]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <div className="mx-auto w-full max-w-2xl">
            <button
              type="button"
              onClick={() => abrirUrlExterna(pdfFinal)}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#4CCB7A] px-4 text-base font-semibold text-[#0A1F44] transition-colors hover:bg-[#45b86d]"
            >
              <ExternalLink className="h-5 w-5 shrink-0" aria-hidden />
              {status === 'aguardando_medico'
                ? 'Baixar contrato assinado'
                : 'Baixar / abrir contrato final'}
            </button>
          </div>
        </footer>
      )}
    </div>
  );

  return (
    <>
      {createPortal(content, document.body)}
      <ContratoPacienteOpcaoEntregaModal
        open={modalOpcaoAberto}
        onClose={() => {
          if (!salvandoOpcao) setModalOpcaoAberto(false);
        }}
        onConfirm={(opcao) => void handleConfirmarOpcao(opcao)}
        loading={salvandoOpcao || preparandoAssinatura}
      />
    </>
  );
}
