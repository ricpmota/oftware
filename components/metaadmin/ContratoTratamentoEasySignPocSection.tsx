'use client';

import { useState } from 'react';
import { Copy, Download, ExternalLink, Loader2, UserCheck } from 'lucide-react';
import type { ContratoTratamentoDocumentoRecord } from '@/lib/documentos/contrato-tratamento/contratoTratamentoTypes';
import { isContratoEasySignPocEnabledClient } from '@/lib/documentos/contrato-tratamento/contratoEasySignPocFlag';
import {
  contratoElegivelDisponibilizarPaciente,
  contratoPacienteLinkJaGerado,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoPacienteDisponibilidade';
import {
  requestContratoEasySignCreateLink,
  requestContratoEasySignDownloadFinal,
} from '@/lib/signature/requestContratoEasySignPoc';
import { openContratoTratamentoPdfUrl } from '@/lib/documentos/contrato-tratamento/contratoTratamentoPdf';

export type ContratoTratamentoEasySignPocSectionProps = {
  pacienteId: string;
  documento: ContratoTratamentoDocumentoRecord | null;
  onDocumentoRefresh: () => Promise<void>;
  onError: (message: string | null) => void;
};

const actionBtnClass =
  'flex items-center gap-3 px-4 py-3 rounded-xl border text-left disabled:opacity-50 disabled:cursor-not-allowed';

const ERRO_DISPONIBILIZAR_MSG =
  'Não foi possível disponibilizar o contrato no portal do paciente. Tente novamente.';

/**
 * Recuperação manual (contratos antigos) e gestão do link EasySign do paciente.
 * Inclui contratos assinados pelo médico antes da Etapa 2.1 sem pacienteSignLinkUrl.
 */
export default function ContratoTratamentoEasySignPocSection({
  pacienteId,
  documento,
  onDocumentoRefresh,
  onError,
}: ContratoTratamentoEasySignPocSectionProps) {
  const [loading, setLoading] = useState<'create' | 'download' | null>(null);
  const [copied, setCopied] = useState(false);

  const easySignHabilitado = isContratoEasySignPocEnabledClient();
  const elegivelRecuperacao = contratoElegivelDisponibilizarPaciente(documento);
  const pacientePodeAssinar = contratoPacienteLinkJaGerado(documento);
  const linkGeracaoFalhou = documento?.pacienteSignStatus === 'erro_gerar_link';

  if (!documento || !elegivelRecuperacao) return null;

  const handleDisponibilizar = async () => {
    if (!documento.id) return;
    setLoading('create');
    onError(null);
    try {
      await requestContratoEasySignCreateLink({
        pacienteId,
        documentoId: documento.id,
      });
      await onDocumentoRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : ERRO_DISPONIBILIZAR_MSG);
    } finally {
      setLoading(null);
    }
  };

  const handleCopiarAcesso = async () => {
    const url = documento.pacienteSignLinkUrl;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onError('Não foi possível copiar o acesso do paciente.');
    }
  };

  const handleAbrirPortal = () => {
    if (documento.pacienteSignLinkUrl) {
      window.open(documento.pacienteSignLinkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleBaixarFinal = async () => {
    if (!documento.id) return;
    setLoading('download');
    onError(null);
    try {
      const result = await requestContratoEasySignDownloadFinal({
        pacienteId,
        documentoId: documento.id,
      });
      await onDocumentoRefresh();
      if (result.pdfFinalAssinadoUrl) {
        openContratoTratamentoPdfUrl(result.pdfFinalAssinadoUrl);
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Não foi possível obter o contrato final assinado.');
    } finally {
      setLoading(null);
    }
  };

  if (!easySignHabilitado) {
    return (
      <div className="sm:col-span-2 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Assinatura do paciente
        </p>
        <button
          type="button"
          disabled
          className={`${actionBtnClass} w-full border-gray-200 bg-white text-gray-400 cursor-not-allowed`}
        >
          <UserCheck className="h-5 w-5" />
          <span className="text-sm font-medium">Disponibilizar contrato no portal do paciente</span>
        </button>
        <p className="text-xs text-gray-600 px-1">
          Assinatura eletrônica do paciente ainda não habilitada.
        </p>
      </div>
    );
  }

  return (
    <div className="sm:col-span-2 space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
        Assinatura do paciente
      </p>

      {linkGeracaoFalhou ? (
        <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 px-3 py-3">
          <p className="text-sm text-red-900 leading-relaxed">{ERRO_DISPONIBILIZAR_MSG}</p>
          {documento.pacienteSignErrorMessage ? (
            <p className="text-xs text-red-800/80 font-mono break-words">
              {documento.pacienteSignErrorMessage}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleDisponibilizar}
            disabled={loading !== null}
            className={`${actionBtnClass} w-full border-red-300 bg-white hover:bg-red-50`}
          >
            {loading === 'create' ? (
              <Loader2 className="h-5 w-5 animate-spin text-red-700" />
            ) : (
              <UserCheck className="h-5 w-5 text-red-700" />
            )}
            <span className="text-sm font-medium text-red-950">
              Disponibilizar contrato no portal do paciente
            </span>
          </button>
        </div>
      ) : !pacientePodeAssinar ? (
        <div className="space-y-2">
          <p className="text-sm text-amber-950 bg-white rounded-lg border border-amber-100 px-3 py-2">
            Este contrato foi assinado pelo médico, mas o link de assinatura do paciente ainda não
            foi gerado. Clique abaixo para disponibilizar no portal.
          </p>
          <button
            type="button"
            onClick={handleDisponibilizar}
            disabled={loading !== null}
            className={`${actionBtnClass} w-full border-amber-300 bg-white hover:bg-amber-50`}
          >
            {loading === 'create' ? (
              <Loader2 className="h-5 w-5 animate-spin text-amber-700" />
            ) : (
              <UserCheck className="h-5 w-5 text-amber-700" />
            )}
            <span className="text-sm font-medium text-amber-950">
              Disponibilizar contrato no portal do paciente
            </span>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-amber-950 bg-white rounded-lg border border-amber-100 px-3 py-2">
            O contrato foi assinado pelo médico e já está disponível para assinatura no portal do
            paciente.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleCopiarAcesso}
              className={`${actionBtnClass} border-gray-200 bg-white hover:bg-gray-50 justify-center sm:justify-start`}
            >
              <Copy className="h-4 w-4 text-gray-700" />
              <span className="text-sm font-medium">{copied ? 'Copiado!' : 'Copiar acesso'}</span>
            </button>
            <button
              type="button"
              onClick={handleAbrirPortal}
              className={`${actionBtnClass} border-blue-200 bg-blue-50 hover:bg-blue-100 justify-center sm:justify-start`}
            >
              <ExternalLink className="h-4 w-4 text-blue-700" />
              <span className="text-sm font-medium text-blue-900">Abrir portal do paciente</span>
            </button>
            <button
              type="button"
              onClick={handleBaixarFinal}
              disabled={loading !== null}
              className={`${actionBtnClass} border-green-200 bg-green-50 hover:bg-green-100 justify-center sm:justify-start`}
            >
              {loading === 'download' ? (
                <Loader2 className="h-4 w-4 animate-spin text-green-700" />
              ) : (
                <Download className="h-4 w-4 text-green-700" />
              )}
              <span className="text-sm font-medium text-green-900">Baixar contrato final</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
