'use client';



import { useCallback, useEffect, useState } from 'react';

import { createPortal } from 'react-dom';

import { Loader2, X } from 'lucide-react';

import BrySignatureSessionReconnectPanel from '@/components/signature/BrySignatureSessionReconnectPanel';

import {

  getPrescriptionSignedPrintEligibility,

  isPrescriptionSignedPrintButtonEnabled,

  PRESCRIPTION_PRINT_PROFILE_SETUP_MESSAGE,

} from '@/lib/signature/prescriptionPrintEligibility';

import { isBrySignatureSessionExpiredError } from '@/lib/signature/brySignatureConstants';
import {
  isBryPrescriptionReconnectNeeded,
  isBrySignatureSessionExpiredOnClient,
} from '@/lib/signature/bryPrescriptionReconnect';

import type { PrescriptionSignedPrintResult } from '@/lib/signature/runPrescriptionSignedPrint';

import type { DoctorSignatureProviderConfig } from '@/types/doctorSignatureProvider';



/** Acima de PrescricaoLeituraModal (10050) e demais overlays da app. */
export const SIGNATURE_PRINT_PORTAL_Z_INDEX = 10200;
/** Modal de prescrições mobile (z-9999) + leitura (z-10300). */
export const SIGNATURE_PRINT_PORTAL_Z_INDEX_MOBILE_PRESCRICOES = 10400;
/** Acima do modal de exames mobile (z-70) e solicitar exames (z-80). */
export const SIGNATURE_PRINT_PORTAL_Z_INDEX_MOBILE_EXAMES = 11000;



export type PrescriptionPrintModeModalProps = {

  open: boolean;

  onClose: () => void;

  providerConfig?: DoctorSignatureProviderConfig | null;

  /** Quando true, desabilita assinatura digital (ex.: recibo). */

  isRecibo?: boolean;

  /** Título do modal (ex.: requisição de exames). */

  modalTitle?: string;

  onPrintUnsigned: () => Promise<void> | void;

  onPrintSigned: (

    onProgress?: (phase: 'generating_pdf' | 'submitting_signature') => void

  ) => Promise<PrescriptionSignedPrintResult | void> | PrescriptionSignedPrintResult | void;

  /** ID do médico (reconexão BRy após sessão expirada). */

  medicoId?: string;

  zIndexClass?: string;

  /** z-index numérico do overlay (portal em document.body). */
  portalZIndex?: number;

};



export default function PrescriptionPrintModeModal({

  open,

  onClose,

  providerConfig,

  isRecibo = false,

  modalTitle = 'Gerar prescrição',

  onPrintUnsigned,

  onPrintSigned,

  medicoId,

  portalZIndex = SIGNATURE_PRINT_PORTAL_Z_INDEX,

}: PrescriptionPrintModeModalProps) {

  const [loadingUnsigned, setLoadingUnsigned] = useState(false);

  const [loadingSigned, setLoadingSigned] = useState(false);

  const [signedLoadingLabel, setSignedLoadingLabel] = useState('Gerando PDF com assinatura digital...');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [sessionReconnectOpen, setSessionReconnectOpen] = useState(false);



  const signedEligibility = getPrescriptionSignedPrintEligibility(providerConfig, { isRecibo });

  const signedButtonEnabled = isPrescriptionSignedPrintButtonEnabled(providerConfig, { isRecibo });

  const signedButtonDisabledMessage = PRESCRIPTION_PRINT_PROFILE_SETUP_MESSAGE;

  const showSandboxHint = signedEligibility.allowed && signedEligibility.mode === 'sandbox';

  const brySessionReconnectRecommended =
    signedEligibility.allowed &&
    signedEligibility.mode === 'bry_cloud' &&
    (signedEligibility.sessionReconnectRecommended === true ||
      isBrySignatureSessionExpiredOnClient(providerConfig));

  useEffect(() => {
    if (!open) {
      setErrorMessage(null);
      setInfoMessage(null);
      setLoadingUnsigned(false);
      setLoadingSigned(false);
      setSignedLoadingLabel('Gerando PDF com assinatura digital...');
      setSessionReconnectOpen(false);
      return;
    }
    if (brySessionReconnectRecommended) {
      setSessionReconnectOpen(true);
      setErrorMessage(null);
    }
  }, [open, brySessionReconnectRecommended]);



  useEffect(() => {

    if (!open) return;

    const prev = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {

      if (e.key === 'Escape' && !loadingUnsigned && !loadingSigned && !sessionReconnectOpen) {

        onClose();

      }

    };

    window.addEventListener('keydown', onKey);

    return () => {

      document.body.style.overflow = prev;

      window.removeEventListener('keydown', onKey);

    };

  }, [open, onClose, loadingUnsigned, loadingSigned, sessionReconnectOpen]);



  const runUnsigned = useCallback(async () => {

    setErrorMessage(null);

    setInfoMessage(null);

    setLoadingUnsigned(true);

    try {

      await onPrintUnsigned();

      onClose();

    } catch (e) {

      console.error(e);

      setErrorMessage(e instanceof Error ? e.message : 'Erro ao gerar PDF.');

    } finally {

      setLoadingUnsigned(false);

    }

  }, [onPrintUnsigned, onClose]);



  const runSigned = useCallback(async () => {
    if (!signedEligibility.allowed) {
      if (isBryPrescriptionReconnectNeeded({ providerConfig, message: signedEligibility.message })) {
        setSessionReconnectOpen(true);
        setErrorMessage(null);
        return;
      }
      setErrorMessage(signedEligibility.message);
      return;
    }

    if (brySessionReconnectRecommended) {
      setSessionReconnectOpen(true);
      setErrorMessage(null);
      return;
    }

    setErrorMessage(null);

    setInfoMessage(null);

    setLoadingSigned(true);

    setSignedLoadingLabel('Gerando PDF...');

    try {

      const result = await onPrintSigned((phase) => {

        if (phase === 'generating_pdf') setSignedLoadingLabel('Gerando PDF...');

        if (phase === 'submitting_signature') setSignedLoadingLabel('Enviando para assinatura digital...');

      });

      if (result?.outcome === 'pending') {

        setInfoMessage(result.message);

        return;

      }

      onClose();

    } catch (e) {
      console.error(e);
      if (isBryPrescriptionReconnectNeeded({ providerConfig, error: e })) {
        setSessionReconnectOpen(true);
        setErrorMessage(null);
        return;
      }
      setErrorMessage(e instanceof Error ? e.message : 'Erro ao gerar PDF assinado.');
    } finally {
      setLoadingSigned(false);
    }
  }, [
    onPrintSigned,
    onClose,
    signedEligibility,
    providerConfig,
    brySessionReconnectRecommended,
  ]);



  if (!open || typeof document === 'undefined') return null;



  const busy = loadingUnsigned || loadingSigned;



  return createPortal(

    <div

      className="fixed inset-0 flex items-center justify-center p-4 bg-black/55 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"

      style={{ zIndex: portalZIndex }}

      role="presentation"

      onClick={() => {

        if (busy || sessionReconnectOpen) return;

        onClose();

      }}

    >

      {sessionReconnectOpen ? (

        <BrySignatureSessionReconnectPanel

          medicoId={medicoId}

          providerConfig={providerConfig}

          onClose={() => setSessionReconnectOpen(false)}

        />

      ) : (

        <div

          role="dialog"

          aria-modal="true"

          aria-labelledby="prescription-print-mode-title"

          className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 relative border border-gray-200 dark:border-gray-700"

          onClick={(e) => e.stopPropagation()}

        >

          <button

            type="button"

            onClick={onClose}

            disabled={busy}

            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"

            aria-label="Fechar"

          >

            <X className="h-5 w-5" />

          </button>



          <h3

            id="prescription-print-mode-title"

            className="text-lg font-semibold text-gray-900 dark:text-white pr-8"

          >

            {modalTitle}

          </h3>

          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 mb-4">

            Escolha como deseja gerar este documento.

          </p>



          {showSandboxHint && (

            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">

              Ambiente de teste — sem validade jurídica.

            </p>

          )}



          {!signedButtonEnabled && !isRecibo && providerConfig?.provider && providerConfig.provider !== 'none' && (

            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">{signedButtonDisabledMessage}</p>

          )}



          {infoMessage && (

            <p

              className="text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mb-4"

              role="status"

            >

              {infoMessage}

            </p>

          )}



          {errorMessage && (

            <p

              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4"

              role="alert"

            >

              {errorMessage}

            </p>

          )}



          <div className="flex flex-col gap-2">

            <button

              type="button"

              disabled={busy}

              onClick={() => void runUnsigned()}

              className="w-full px-4 py-2.5 text-sm font-medium text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center gap-2"

            >

              {loadingUnsigned ? <Loader2 className="h-4 w-4 animate-spin" /> : null}

              Gerar PDF sem assinatura

            </button>



            <button

              type="button"

              disabled={busy || !signedButtonEnabled}

              onClick={() => void runSigned()}

              title={!signedButtonEnabled ? signedButtonDisabledMessage : undefined}

              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex flex-col items-center justify-center gap-0.5"

            >

              <span className="inline-flex items-center gap-2">

                {loadingSigned ? <Loader2 className="h-4 w-4 animate-spin" /> : null}

                {loadingSigned ? signedLoadingLabel : 'Gerar PDF com assinatura digital'}

              </span>

              {!loadingSigned && showSandboxHint && (

                <span className="text-[10px] font-normal opacity-90">

                  Ambiente de teste — sem validade jurídica.

                </span>

              )}

            </button>



            <button

              type="button"

              disabled={busy}

              onClick={onClose}

              className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 mt-1"

            >

              Cancelar

            </button>

          </div>



          {!signedEligibility.allowed && providerConfig?.provider === 'none' && (

            <p className="text-xs text-gray-500 mt-3">{PRESCRIPTION_PRINT_PROFILE_SETUP_MESSAGE}</p>

          )}

        </div>

      )}

    </div>,

    document.body

  );

}

