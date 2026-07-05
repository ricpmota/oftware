'use client';



import { useCallback, useEffect, useRef, useState } from 'react';

import { createPortal } from 'react-dom';

import { ExternalLink, Eye, FileSignature, Loader2, Printer, Trash2, X } from 'lucide-react';

import type { Medico } from '@/types/medico';

import type { PacienteCompleto } from '@/types/obesidade';

import { sanitizeDoctorSignatureProviderForClient } from '@/lib/metaadmin/sanitizeDoctorSignatureProviderForClient';

import { CONTRATO_TRATAMENTO_ITEM_NOME } from '@/lib/documentos/contrato-tratamento/contratoTratamentoConstants';

import {
  buildContratoTratamentoTexto,
  obterContratoTratamentoAtual,
  salvarContratoTratamentoDocumento,
  subscribeContratoTratamentoAtual,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoService';
import { requestExcluirContratoTratamento } from '@/lib/documentos/contrato-tratamento/requestExcluirContratoTratamento';

import type { ContratoTratamentoDocumentoRecord } from '@/lib/documentos/contrato-tratamento/contratoTratamentoTypes';

import {

  openContratoTratamentoPdfUrl,

  printContratoTratamentoPdf,

} from '@/lib/documentos/contrato-tratamento/contratoTratamentoPdf';

import { runContratoTratamentoMedicoAssinaAposPaciente } from '@/lib/signature/runContratoTratamentoSignedPrint';
import { requestSolicitarContratoAssinaturaPaciente } from '@/lib/documentos/contrato-tratamento/requestSolicitarContratoAssinaturaPaciente';
import ContratoTratamentoStatusPanel from '@/components/metaadmin/ContratoTratamentoStatusPanel';
import ContratoTratamentoPocValidacaoChecklist from '@/components/metaadmin/ContratoTratamentoPocValidacaoChecklist';
import { isContratoEasySignPocEnabledClient } from '@/lib/documentos/contrato-tratamento/contratoEasySignPocFlag';
import {
  contratoElegivelDisponibilizarPaciente,
  contratoMedicoAssinaturaPendente,
  contratoPacienteLinkJaGerado,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoPacienteDisponibilidade';
import { contratoFluxoPacientePrimeiro, contratoPacienteJaAssinou } from '@/lib/documentos/contrato-tratamento/contratoTratamentoFluxoAssinatura';
import { requestContratoEasySignCreateLink, requestContratoEasySignSyncStatus } from '@/lib/signature/requestContratoEasySignPoc';



export type ContratoTratamentoModalProps = {

  open: boolean;

  paciente: PacienteCompleto;

  medico: Medico;

  onClose: () => void;

  onDocumentoAtualizado?: (documento: ContratoTratamentoDocumentoRecord | null) => void;

  zIndexClass?: string;

};



type ViewMode = 'actions' | 'preview';



function medicoTituloNome(m: Medico | null): string {

  const titulo = m?.genero === 'F' ? 'Dra.' : 'Dr.';

  return `${titulo} ${m?.nome || 'Médico'}`;

}



export default function ContratoTratamentoModal({

  open,

  paciente,

  medico,

  onClose,

  onDocumentoAtualizado,

  zIndexClass = 'z-[10050]',

}: ContratoTratamentoModalProps) {

  const [viewMode, setViewMode] = useState<ViewMode>('actions');

  const [textoPreview, setTextoPreview] = useState('');

  const [loadingPreview, setLoadingPreview] = useState(false);

  const [loadingDoc, setLoadingDoc] = useState(false);

  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [hashDocumento, setHashDocumento] = useState<string>('');

  const [documento, setDocumento] = useState<ContratoTratamentoDocumentoRecord | null>(null);
  const [sincronizandoPaciente, setSincronizandoPaciente] = useState(false);

  const onDocumentoAtualizadoRef = useRef(onDocumentoAtualizado);
  onDocumentoAtualizadoRef.current = onDocumentoAtualizado;

  const providerConfig = sanitizeDoctorSignatureProviderForClient(medico?.doctorSignatureProvider);

  const fluxoPacientePrimeiro = contratoFluxoPacientePrimeiro(documento);
  const aguardandoMedico = contratoMedicoAssinaturaPendente(documento);
  const podeSolicitarPaciente = !documento || documento.statusAssinatura === 'rascunho';
  const pacientePdfAssinado = documento?.pdfFinalAssinadoUrl?.trim() || null;



  const buildCtx = useCallback(

    () => ({

      medicoId: medico.id,

      pacienteId: paciente.id,

      hashDocumento: hashDocumento || documento?.hashDocumento || undefined,

    }),

    [medico.id, paciente.id, hashDocumento, documento?.hashDocumento]

  );



  const refreshDocumento = useCallback(async (options?: { notifyParent?: boolean }) => {

    setLoadingDoc(true);

    try {

      const docAtual = await obterContratoTratamentoAtual(paciente.id);

      setDocumento(docAtual);

      if (docAtual?.hashDocumento) setHashDocumento(docAtual.hashDocumento);

      if (options?.notifyParent !== false) {
        onDocumentoAtualizadoRef.current?.(docAtual);
      }

      return docAtual;

    } catch (e) {

      console.error('Erro ao carregar status do contrato:', e);

      return null;

    } finally {

      setLoadingDoc(false);

    }

  }, [paciente.id]);



  useEffect(() => {

    if (!open) {

      setViewMode('actions');

      setTextoPreview('');

      setErrorMessage(null);

      setLoadingAction(null);

      setDocumento(null);

      setLoadingDoc(false);

      setLoadingPreview(false);

      return;

    }

    let cancelled = false;

    (async () => {

      setLoadingDoc(true);

      setLoadingPreview(true);

      setErrorMessage(null);

      try {

        const docAtual = await obterContratoTratamentoAtual(paciente.id);

        if (cancelled) return;

        setDocumento(docAtual);

        const hashInicial = docAtual?.hashDocumento || '';

        if (hashInicial) setHashDocumento(hashInicial);

        onDocumentoAtualizadoRef.current?.(docAtual);

        const { texto, hashDocumento: hash } = await buildContratoTratamentoTexto(medico, paciente, {

          medicoId: medico.id,

          pacienteId: paciente.id,

          hashDocumento: hashInicial || undefined,

        });

        if (cancelled) return;

        setHashDocumento(hash);

        setTextoPreview(texto);

      } catch (e) {

        if (!cancelled) {

          setErrorMessage(e instanceof Error ? e.message : 'Erro ao carregar contrato.');

        }

      } finally {

        if (!cancelled) {

          setLoadingDoc(false);

          setLoadingPreview(false);

        }

      }

    })();

    return () => {

      cancelled = true;

    };

  }, [open, paciente.id, medico.id]);

  useEffect(() => {
    if (!open || !paciente.id) return;

    const unsub = subscribeContratoTratamentoAtual(paciente.id, (docAtual) => {
      setDocumento(docAtual);
      if (docAtual?.hashDocumento) setHashDocumento(docAtual.hashDocumento);
      onDocumentoAtualizadoRef.current?.(docAtual);
    });

    return unsub;
  }, [open, paciente.id]);

  useEffect(() => {
    if (!open || !documento?.id) return;
    if (documento.statusAssinatura !== 'aguardando_paciente' || contratoPacienteJaAssinou(documento)) {
      return;
    }
    if (!documento.bryEasySignEnvelopeId?.trim() && !documento.pacienteSignLinkUrl?.trim()) {
      return;
    }

    let cancelled = false;

    const sync = async () => {
      if (cancelled) return;
      setSincronizandoPaciente(true);
      try {
        const result = await requestContratoEasySignSyncStatus({
          pacienteId: paciente.id,
          documentoId: documento.id,
        });
        if (cancelled || result.pending) return;
        await refreshDocumento({ notifyParent: true });
      } catch {
        /* ignora — próxima tentativa */
      } finally {
        if (!cancelled) setSincronizandoPaciente(false);
      }
    };

    const onFocus = () => {
      void sync();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void sync();
    };

    void sync();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    const intervalId = window.setInterval(() => {
      void sync();
    }, 5000);

    return () => {
      cancelled = true;
      setSincronizandoPaciente(false);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(intervalId);
    };
  }, [
    open,
    paciente.id,
    documento?.id,
    documento?.statusAssinatura,
    documento?.bryEasySignEnvelopeId,
    documento?.pacienteSignLinkUrl,
    documento?.pacienteAssinadoEm,
    documento?.pdfFinalAssinadoUrl,
    documento?.pacienteSignStatus,
    refreshDocumento,
  ]);



  useEffect(() => {

    if (!open) return;

    const prev = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {

      if (e.key === 'Escape') onClose();

    };

    window.addEventListener('keydown', onKey);

    return () => {

      document.body.style.overflow = prev;

      window.removeEventListener('keydown', onKey);

    };

  }, [open, onClose]);



  const persistirRascunho = async (hash: string) => {

    const docId = await salvarContratoTratamentoDocumento({

      pacienteId: paciente.id,

      medicoId: medico.id,

      hashDocumento: hash,

      statusAssinatura: 'rascunho',

      documentoId: documento?.id,

    });

    await refreshDocumento();

    return docId;

  };



  const handleImprimir = async () => {

    setLoadingAction('print');

    setErrorMessage(null);

    try {

      const { hashDocumento: hash } = await buildContratoTratamentoTexto(medico, paciente, buildCtx());

      setHashDocumento(hash);

      await printContratoTratamentoPdf(medico, paciente, { ...buildCtx(), hashDocumento: hash });

    } catch (e) {

      setErrorMessage(e instanceof Error ? e.message : 'Erro ao imprimir.');

    } finally {

      setLoadingAction(null);

    }

  };



  const handleExcluirContrato = async () => {

    if (!documento?.id) return;

    const tinhaAssinaturaPaciente =
      documento.statusAssinatura === 'assinado_completo' ||
      documento.statusAssinatura === 'aguardando_medico' ||
      Boolean(documento.pacienteAssinadoEm) ||
      documento.pacienteSignStatus === 'assinado';

    const msg = tinhaAssinaturaPaciente
      ? 'Este contrato (ou uma versão anterior) já foi assinado pelo paciente. Excluir remove todos os registros no sistema e no portal do paciente. Deseja continuar?'
      : 'Excluir este contrato? O paciente deixará de ver o documento no portal. Você poderá gerar e assinar um novo contrato em seguida.';

    if (!window.confirm(msg)) return;

    setLoadingAction('delete');

    setErrorMessage(null);

    try {

      const result = await requestExcluirContratoTratamento({
        pacienteId: paciente.id,
        documentoId: documento.id,
      });

      if (result.deletedDocumentoIds.length === 0) {
        throw new Error(
          'Nenhum contrato foi removido no servidor. Verifique se o deploy mais recente está ativo ou fale com o suporte.'
        );
      }

      if (result.pacienteIdsLimpos.length > 1) {
        console.info('[contrato] Limpeza em cadastros duplicados do paciente', {
          pacienteIdsLimpos: result.pacienteIdsLimpos,
          deletedDocumentoIds: result.deletedDocumentoIds,
        });
      }

      setDocumento(null);

      setHashDocumento('');

      const { texto, hashDocumento: hash } = await buildContratoTratamentoTexto(medico, paciente, {

        medicoId: medico.id,

        pacienteId: paciente.id,

      });

      setHashDocumento(hash);

      setTextoPreview(texto);

      onDocumentoAtualizadoRef.current?.(null);

    } catch (e) {

      setErrorMessage(e instanceof Error ? e.message : 'Não foi possível excluir o contrato.');

    } finally {

      setLoadingAction(null);

    }

  };



  const pdfAssinadoMedico = documento?.pdfAssinadoMedicoUrl || documento?.pdfUrl || null;

  const handleSolicitarAssinaturaPaciente = async () => {
    setLoadingAction('solicitar');
    setErrorMessage(null);
    try {
      const { hashDocumento: hash } = await buildContratoTratamentoTexto(medico, paciente, buildCtx());
      setHashDocumento(hash);
      await requestSolicitarContratoAssinaturaPaciente({
        pacienteId: paciente.id,
        medicoId: medico.id,
        hashDocumento: hash,
        documentoId: documento?.id,
      });
      await refreshDocumento();
    } catch (e) {
      setErrorMessage(
        e instanceof Error ? e.message : 'Não foi possível solicitar assinatura do paciente.'
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleMedicoAssinaAposPaciente = async () => {
    if (!documento?.id || !pacientePdfAssinado) return;
    setLoadingAction('medico');
    setErrorMessage(null);
    try {
      const hash = hashDocumento || documento.hashDocumento;
      await runContratoTratamentoMedicoAssinaAposPaciente({
        patientId: paciente.id,
        paciente,
        medico,
        medicoId: medico.id,
        documentoId: documento.id,
        pacientePdfUrl: pacientePdfAssinado,
        hashDocumento: hash,
        providerConfig: providerConfig ?? undefined,
      });
      await refreshDocumento();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Erro ao assinar contrato.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleVerContratoAssinado = () => {

    if (!pdfAssinadoMedico) return;

    openContratoTratamentoPdfUrl(pdfAssinadoMedico);

  };



  const handleGerarLinkPaciente = async () => {

    if (!documento?.id) return;

    setLoadingAction('easysign');

    setErrorMessage(null);

    try {

      await requestContratoEasySignCreateLink({

        pacienteId: paciente.id,

        documentoId: documento.id,

      });

      await refreshDocumento();

    } catch (e) {

      setErrorMessage(

        e instanceof Error ? e.message : 'Não foi possível liberar a assinatura do paciente.'

      );

    } finally {

      setLoadingAction(null);

    }

  };



  const mostrarGerarLinkPaciente =

    isContratoEasySignPocEnabledClient() &&

    contratoElegivelDisponibilizarPaciente(documento) &&

    !contratoPacienteLinkJaGerado(documento);



  if (!open || typeof document === 'undefined') return null;



  const actionBtnClass =

    'flex items-center gap-3 px-4 py-3 rounded-xl border text-left disabled:opacity-50 disabled:cursor-not-allowed';



  return createPortal(

    <>

      <div

        className={`fixed inset-0 ${zIndexClass} flex items-stretch justify-center sm:items-center sm:p-4 bg-black/50`}

        role="presentation"

        onClick={onClose}

      >

        <div

          role="dialog"

          aria-modal="true"

          aria-labelledby="contrato-tratamento-titulo"

          className="bg-white text-gray-900 flex flex-col overflow-hidden border-gray-200

            h-[100dvh] max-h-[100dvh] w-full min-h-0 sm:h-auto sm:max-h-[min(90vh,800px)] sm:max-w-2xl sm:rounded-xl shadow-2xl sm:border"

          onClick={(e) => e.stopPropagation()}

        >

          <div className="flex-shrink-0 flex items-start justify-between gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50/80 pt-[max(0.75rem,env(safe-area-inset-top))]">

            <div className="min-w-0">

              <h3 id="contrato-tratamento-titulo" className="text-base sm:text-lg font-bold text-gray-900">

                📄 {CONTRATO_TRATAMENTO_ITEM_NOME}

              </h3>

              <p className="text-xs text-gray-600 mt-0.5">

                {paciente.dadosIdentificacao?.nomeCompleto || paciente.nome}

              </p>

            </div>

            <button

              type="button"

              onClick={onClose}

              className="p-2 rounded-lg text-gray-600 hover:bg-gray-200"

              aria-label="Fechar"

            >

              <X className="h-5 w-5" />

            </button>

          </div>



          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4">

            {errorMessage ? (

              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">

                {errorMessage}

              </p>

            ) : null}



            {viewMode === 'actions' ? (

              <>

                <div className="relative">

                  <ContratoTratamentoStatusPanel
                    documento={documento}
                    sincronizandoPaciente={sincronizandoPaciente}
                  />

                  {loadingDoc ? (

                    <div className="absolute inset-0 rounded-xl bg-white/70 flex items-center justify-center gap-2 text-sm text-gray-600">

                      <Loader2 className="h-4 w-4 animate-spin" />

                      Atualizando status…

                    </div>

                  ) : null}

                </div>



                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                  <button

                    type="button"

                    onClick={() => setViewMode('preview')}

                    disabled={loadingPreview}

                    className={`${actionBtnClass} border-gray-200 bg-white hover:bg-gray-50`}

                  >

                    {loadingPreview ? (

                      <Loader2 className="h-5 w-5 animate-spin text-gray-500" />

                    ) : (

                      <Eye className="h-5 w-5 text-blue-600" />

                    )}

                    <span className="text-sm font-medium">Visualizar contrato</span>

                  </button>

                  <button

                    type="button"

                    onClick={handleImprimir}

                    disabled={loadingAction !== null}

                    className={`${actionBtnClass} border-gray-200 bg-white hover:bg-gray-50`}

                  >

                    {loadingAction === 'print' ? (

                      <Loader2 className="h-5 w-5 animate-spin text-gray-500" />

                    ) : (

                      <Printer className="h-5 w-5 text-gray-700" />

                    )}

                    <span className="text-sm font-medium">Imprimir</span>

                  </button>

                  {podeSolicitarPaciente && !aguardandoMedico ? (
                    <button
                      type="button"
                      onClick={() => void handleSolicitarAssinaturaPaciente()}
                      disabled={loadingAction !== null}
                      className={`${actionBtnClass} border-purple-200 bg-purple-50 hover:bg-purple-100 sm:col-span-2`}
                    >
                      {loadingAction === 'solicitar' ? (
                        <Loader2 className="h-5 w-5 animate-spin text-purple-700" />
                      ) : (
                        <FileSignature className="h-5 w-5 text-purple-700" />
                      )}
                      <span className="text-sm font-medium text-purple-900">
                        Solicitar assinatura do paciente
                      </span>
                    </button>
                  ) : null}

                  {documento?.statusAssinatura === 'aguardando_paciente' &&
                  fluxoPacientePrimeiro &&
                  documento.solicitadoPacienteEm ? (
                    <p className="text-sm text-amber-900 leading-relaxed sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                      Solicitação enviada. O paciente precisa assinar no portal /meta para continuar.
                    </p>
                  ) : null}

                  {aguardandoMedico && pacientePdfAssinado ? (
                    <button
                      type="button"
                      onClick={() => void handleMedicoAssinaAposPaciente()}
                      disabled={loadingAction !== null}
                      className={`${actionBtnClass} border-purple-200 bg-purple-50 hover:bg-purple-100 sm:col-span-2`}
                    >
                      {loadingAction === 'medico' ? (
                        <Loader2 className="h-5 w-5 animate-spin text-purple-700" />
                      ) : (
                        <FileSignature className="h-5 w-5 text-purple-700" />
                      )}
                      <span className="text-sm font-medium text-purple-900">
                        Assinar digitalmente como médico
                      </span>
                    </button>
                  ) : null}

                  {pacientePdfAssinado && !pdfAssinadoMedico ? (
                    <button
                      type="button"
                      onClick={() => openContratoTratamentoPdfUrl(pacientePdfAssinado)}
                      className={`${actionBtnClass} border-teal-200 bg-teal-50 hover:bg-teal-100 sm:col-span-2`}
                    >
                      <ExternalLink className="h-5 w-5 text-teal-700" />
                      <span className="text-sm font-medium text-teal-900">
                        Ver contrato assinado pelo paciente
                      </span>
                    </button>
                  ) : null}

                  {pdfAssinadoMedico ? (

                    <button

                      type="button"

                      onClick={handleVerContratoAssinado}

                      className={`${actionBtnClass} border-indigo-200 bg-indigo-50 hover:bg-indigo-100 sm:col-span-2`}

                    >

                      <ExternalLink className="h-5 w-5 text-indigo-700" />

                      <span className="text-sm font-medium text-indigo-900">

                        Ver contrato assinado pelo médico

                      </span>

                    </button>

                  ) : null}

                  {mostrarGerarLinkPaciente ? (
                    <button
                      type="button"
                      onClick={handleGerarLinkPaciente}
                      disabled={loadingAction !== null}
                      className={`${actionBtnClass} border-amber-300 bg-amber-50 hover:bg-amber-100 sm:col-span-2`}
                    >
                      {loadingAction === 'easysign' ? (
                        <Loader2 className="h-5 w-5 animate-spin text-amber-800" />
                      ) : (
                        <FileSignature className="h-5 w-5 text-amber-800" />
                      )}
                      <span className="text-sm font-medium text-amber-950">
                        Liberar assinatura do paciente no portal
                      </span>
                    </button>
                  ) : null}

                  {documento?.id ? (
                    <button
                      type="button"
                      onClick={handleExcluirContrato}
                      disabled={loadingAction !== null}
                      className={`${actionBtnClass} border-red-200 bg-red-50 hover:bg-red-100 sm:col-span-2`}
                    >
                      {loadingAction === 'delete' ? (
                        <Loader2 className="h-5 w-5 animate-spin text-red-700" />
                      ) : (
                        <Trash2 className="h-5 w-5 text-red-700" />
                      )}
                      <span className="text-sm font-medium text-red-900">Excluir contrato</span>
                    </button>
                  ) : null}

                  {documento?.statusAssinatura === 'assinado_completo' &&
                  documento.pdfFinalAssinadoUrl ? (
                    <button
                      type="button"
                      onClick={() => openContratoTratamentoPdfUrl(documento.pdfFinalAssinadoUrl!)}
                      className={`${actionBtnClass} border-green-200 bg-green-50 hover:bg-green-100 sm:col-span-2`}
                    >
                      <ExternalLink className="h-5 w-5 text-green-700" />
                      <span className="text-sm font-medium text-green-900">
                        Ver PDF final assinado (médico + paciente)
                      </span>
                    </button>
                  ) : null}

                  <ContratoTratamentoPocValidacaoChecklist
                    show={Boolean(documento?.pdfFinalAssinadoUrl)}
                  />

                </div>

              </>

            ) : (

              <div className="space-y-3">

                <button

                  type="button"

                  onClick={() => setViewMode('actions')}

                  className="text-sm text-blue-600 hover:underline"

                >

                  ← Voltar às opções

                </button>

                <div className="border border-gray-200 rounded-xl bg-white p-4 sm:p-6">

                  <div className="border-b border-gray-200 pb-4 mb-4">

                    <div className="text-lg font-bold text-[#2c3e50]">{medicoTituloNome(medico)}</div>

                    <div className="text-xs text-gray-600 mt-1">

                      CRM-{medico.crm?.estado || 'XX'} {medico.crm?.numero || '00000'}

                    </div>

                  </div>

                  <pre className="text-xs sm:text-sm whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">

                    {textoPreview || 'Carregando...'}

                  </pre>

                </div>

              </div>

            )}

          </div>

        </div>

      </div>

    </>,

    document.body

  );

}


