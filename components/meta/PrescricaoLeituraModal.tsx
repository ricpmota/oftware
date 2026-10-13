'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Printer, X } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import type { Prescricao } from '@/types/prescricao';
import type { Medico } from '@/types/medico';
import { MedicoService } from '@/services/medicoService';
import PrescriptionPrintModeModal from '@/components/signature/PrescriptionPrintModeModal';
import PrescriptionPrintTypeModal from '@/components/signature/PrescriptionPrintTypeModal';
import { sanitizeDoctorSignatureProviderForClient } from '@/lib/metaadmin/sanitizeDoctorSignatureProviderForClient';
import {
  createPrescriptionPrintGate,
  type PrescriptionPrintGateState,
} from '@/lib/metaadmin/prescriptionPrintByType';
import type { PrescriptionPrintLanguage } from '@/types/prescriptionPrintLanguage';
import type { PrescriptionPrintType } from '@/types/prescriptionPrintType';

function formatarDataHora(d: Date): string {
  try {
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '';
  }
}

function isDataReciboISOValid(iso: string): boolean {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return false;
  const [y, m, day] = iso.trim().split('-').map(Number);
  const dt = new Date(y, m - 1, day);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === day;
}

function formatDataReciboISOToPtBr(iso: string): string {
  if (!isDataReciboISOValid(iso)) return '—';
  const [Ty, Tm, Td] = iso.trim().split('-').map(Number);
  return new Date(Ty, Tm - 1, Td).toLocaleDateString('pt-BR');
}

function medicoTituloNome(m: Medico | null): string {
  const titulo = m?.genero === 'F' ? 'Dra.' : 'Dr.';
  return `${titulo} ${m?.nome || 'Médico'}`;
}

function PrescricaoDocumentoArquivo({
  prescricao,
  medico,
  pacienteNome,
  pacienteCpf,
}: {
  prescricao: Prescricao;
  medico: Medico | null;
  pacienteNome: string;
  pacienteCpf?: string;
}) {
  const isRecibo = prescricao.tipoDocumento === 'recibo_medico';

  return (
    <div className="prescricao-preview-print border-b border-gray-200 bg-white text-black dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
      <div className="border-b border-gray-200 p-4 dark:border-gray-700 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-bold leading-tight text-[#2c3e50] dark:text-gray-100">
              {medicoTituloNome(medico)}
            </div>
            <div className="mt-1 text-[9px] text-[#2c3e50] dark:text-gray-300 sm:text-xs">
              CRM-{medico?.crm?.estado || 'XX'} {medico?.crm?.numero || '00000'}
            </div>
            {medico?.email ? (
              <div className="mt-0.5 text-[9px] text-[#2c3e50] dark:text-gray-300 sm:text-xs">
                E-mail: {medico.email}
              </div>
            ) : null}
          </div>
          <img
            src="/icones/logotipo-metodo-28.png"
            alt=""
            className="h-8 w-auto shrink-0 object-contain sm:h-10"
          />
        </div>
      </div>

      {isRecibo ? (
        <div className="space-y-4 p-4 sm:p-6">
          <h4 className="text-base font-bold text-teal-600 sm:text-lg">RECIBO DE PAGAMENTO</h4>
          <div>
            <div className="mb-1 text-xs font-bold text-black dark:text-gray-200">Dados do paciente</div>
            <p className="text-sm">Nome: {pacienteNome}</p>
            {pacienteCpf ? <p className="text-sm">CPF: {pacienteCpf}</p> : null}
          </div>
          <div>
            <div className="mb-1 text-xs font-bold text-black dark:text-gray-200">Profissional</div>
            <p className="text-sm">{medicoTituloNome(medico)}</p>
            <p className="text-sm">
              CRM-{medico?.crm?.estado || 'XX'} {medico?.crm?.numero || '00000'}
            </p>
            {prescricao.reciboDocumentoProfissional === 'cpf' && medico?.cpfPessoal?.trim() ? (
              <p className="text-sm">CPF: {medico.cpfPessoal.trim()}</p>
            ) : null}
            {prescricao.reciboDocumentoProfissional === 'cnpj' && medico?.cnpjEmpresa?.trim() ? (
              <p className="text-sm">CNPJ: {medico.cnpjEmpresa.trim()}</p>
            ) : null}
          </div>
          <div>
            <div className="mb-1 text-xs font-bold text-black dark:text-gray-200">Descrição da consulta</div>
            <p className="whitespace-pre-wrap text-sm">{prescricao.descricao || '—'}</p>
          </div>
          <p className="text-base font-bold">
            Valor:{' '}
            {prescricao.valorConsulta != null && !Number.isNaN(Number(prescricao.valorConsulta))
              ? Number(prescricao.valorConsulta).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              : '—'}
          </p>
          {prescricao.observacoes?.trim() ? (
            <div>
              <div className="mb-1 text-xs font-bold text-black dark:text-gray-200">Observações</div>
              <p className="whitespace-pre-wrap text-sm">{prescricao.observacoes}</p>
            </div>
          ) : null}
          <p className="pt-2 text-xs text-black dark:text-gray-300">
            Data:{' '}
            {prescricao.dataRecibo && isDataReciboISOValid(prescricao.dataRecibo)
              ? formatDataReciboISOToPtBr(prescricao.dataRecibo)
              : '—'}
          </p>
          <p className="pt-4 text-[10px] text-gray-500 dark:text-gray-400">
            Assinatura digital no PDF gerado.
          </p>
        </div>
      ) : (
        <div className="space-y-4 p-4 sm:p-6">
          <h4 className="text-base font-bold text-[#2c3e50] dark:text-gray-100 sm:text-lg">PRESCRIÇÃO MÉDICA</h4>
          <div className="space-y-1 text-sm">
            <p>Paciente: {pacienteNome}</p>
            {pacienteCpf ? <p>CPF: {pacienteCpf}</p> : null}
            {prescricao.pesoPaciente != null ? (
              <p>Peso: {Number(prescricao.pesoPaciente).toFixed(1)} kg</p>
            ) : null}
          </div>
          <div>
            <div className="text-sm font-bold">{prescricao.nome}</div>
            {prescricao.descricao ? (
              <p className="mt-2 whitespace-pre-wrap text-sm">{prescricao.descricao}</p>
            ) : null}
          </div>
          <div>
            <div className="mb-2 text-sm font-bold">MEDICAMENTOS/SUPLEMENTOS:</div>
            <ol className="list-inside list-decimal space-y-3 text-sm">
              {prescricao.itens.map((item, index) => (
                <li key={index} className="pl-1">
                  <span className="font-semibold">{item.medicamento}</span>
                  <div className="ml-4 mt-1 space-y-0.5 text-sm">
                    <div>Dosagem: {item.dosagem}</div>
                    <div>Frequência: {item.frequencia}</div>
                    <div className="whitespace-pre-wrap">{item.instrucoes}</div>
                    {item.quantidade ? <div>Quantidade: {item.quantidade}</div> : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
          {prescricao.observacoes?.trim() ? (
            <div>
              <div className="mb-1 text-sm font-bold">OBSERVAÇÕES:</div>
              <p className="whitespace-pre-wrap text-sm">{prescricao.observacoes}</p>
            </div>
          ) : null}
          <p className="pt-2 text-xs text-black dark:text-gray-300">
            Data: {new Date().toLocaleDateString('pt-BR')}
          </p>
          <div className="w-48 border-t border-gray-300 pt-6 dark:border-gray-600">
            <div className="text-[10px] text-gray-600 dark:text-gray-400">Assinatura do Médico</div>
          </div>
        </div>
      )}
    </div>
  );
}

export type PrescricaoLeituraModalProps = {
  prescricao: Prescricao | null;
  paciente: PacienteCompleto | null;
  /** Médico já conhecido (ex.: logado no metaadmin) — evita busca por ID */
  medicoOverride?: Medico | null;
  onClose?: () => void;
  /** `panel` = arquivo embutido (desktop). `modal` = overlay (mobile). */
  variant?: 'modal' | 'panel';
  /** z-index do overlay (modal pai pode ser 9999) */
  zIndexClass?: string;
  /** z-index do modal “Gerar prescrição” / reconexão BRy (mobile: 10400). */
  printPortalZIndex?: number;
};

/**
 * Modal de visualização de prescrição/recibo (mesmo conteúdo visual do /meta).
 */
export default function PrescricaoLeituraModal({
  prescricao: prescricaoProp,
  paciente,
  medicoOverride,
  onClose,
  variant = 'modal',
  zIndexClass = 'z-[10050]',
  printPortalZIndex,
}: PrescricaoLeituraModalProps) {
  const [prescricaoTraduzida, setPrescricaoTraduzida] = useState<Prescricao | null>(null);
  const prescricao =
    prescricaoTraduzida && prescricaoTraduzida.id === prescricaoProp?.id ? prescricaoTraduzida : prescricaoProp;
  const [medicoCarregado, setMedicoCarregado] = useState<Medico | null>(null);
  const [printModeOpen, setPrintModeOpen] = useState(false);
  const [printTypePickerOpen, setPrintTypePickerOpen] = useState(false);
  const [printGate, setPrintGate] = useState<PrescriptionPrintGateState | null>(null);
  const medicoCacheRef = useRef<Record<string, Medico | null>>({});

  const pacienteNome =
    paciente?.dadosIdentificacao?.nomeCompleto?.trim() || paciente?.nome?.trim() || 'Paciente';
  const pacienteCpf = paciente?.dadosIdentificacao?.cpf?.trim();

  useEffect(() => {
    setPrescricaoTraduzida(null);
  }, [prescricaoProp?.id]);

  useEffect(() => {
    if (!prescricao) {
      setMedicoCarregado(null);
      return;
    }
    if (medicoOverride !== undefined) {
      setMedicoCarregado(medicoOverride ?? null);
      return;
    }
    const id = prescricao.medicoId;
    const cached = medicoCacheRef.current[id];
    if (cached !== undefined) {
      setMedicoCarregado(cached);
      return;
    }
    let cancel = false;
    MedicoService.getMedicoById(id).then((m) => {
      if (cancel) return;
      medicoCacheRef.current[id] = m;
      setMedicoCarregado(m);
    });
    return () => {
      cancel = true;
    };
  }, [prescricao, medicoOverride]);

  const fecharModal = useCallback(() => onClose?.(), [onClose]);

  useEffect(() => {
    if (!prescricao || variant === 'panel') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fecharModal();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [prescricao, fecharModal, variant]);

  const medicoParaPdf = medicoOverride !== undefined ? medicoOverride : medicoCarregado;
  const providerConfig = sanitizeDoctorSignatureProviderForClient(
    medicoParaPdf?.doctorSignatureProvider
  );

  const buildPrintGateForPrescricao = useCallback(
    (printType: PrescriptionPrintType, language: PrescriptionPrintLanguage = 'pt'): PrescriptionPrintGateState | null => {
      if (!prescricao || !paciente) return null;
      const isReciboLocal = prescricao.tipoDocumento === 'recibo_medico';
      return createPrescriptionPrintGate({
        printType,
        language,
        isRecibo: isReciboLocal,
        paciente,
        prescricaoSelecionada: prescricao,
        prescricaoEditando: prescricao,
        novaPrescricao: {
          nome: prescricao.nome || '',
          descricao: prescricao.descricao || '',
          itens: prescricao.itens || [],
          observacoes: prescricao.observacoes || '',
          valorConsulta: prescricao.valorConsulta != null ? String(prescricao.valorConsulta) : '',
          dataRecibo: prescricao.dataRecibo || '',
          reciboDocumentoProfissional:
            prescricao.reciboDocumentoProfissional === 'cpf' ||
            prescricao.reciboDocumentoProfissional === 'cnpj'
              ? prescricao.reciboDocumentoProfissional
              : 'omitir',
        },
        salvar: async () => ({ ok: true, prescricaoSalva: prescricao }),
        medico: medicoParaPdf,
        providerConfig: providerConfig ?? undefined,
        onPrescricaoSalvaEmIngles: (prescricaoEn) => setPrescricaoTraduzida(prescricaoEn),
      });
    },
    [prescricao, paciente, medicoParaPdf, providerConfig]
  );

  const handleOpenPrint = () => {
    if (!prescricao || !paciente) return;
    const isReciboLocal = prescricao.tipoDocumento === 'recibo_medico';
    if (isReciboLocal) {
      const gate = buildPrintGateForPrescricao('simple');
      if (gate) setPrintGate(gate);
      setPrintModeOpen(true);
      return;
    }
    setPrintTypePickerOpen(true);
    setPrintGate(null);
  };

  const handlePrintTypeSelect = (printType: PrescriptionPrintType, language: PrescriptionPrintLanguage) => {
    const gate = buildPrintGateForPrescricao(printType, language);
    if (gate) setPrintGate(gate);
    setPrintTypePickerOpen(false);
    setPrintModeOpen(true);
  };

  const handlePrintUnsigned = async () => {
    if (!printGate) throw new Error('Fluxo de impressão indisponível.');
    await printGate.unsigned();
  };

  const handlePrintSigned = async (
    onProgress?: (phase: 'translating' | 'generating_pdf' | 'submitting_signature') => void
  ) => {
    if (!printGate) return;
    return printGate.signed(onProgress);
  };

  const printModals = prescricao ? (
    <>
      <PrescriptionPrintTypeModal
        open={printTypePickerOpen}
        onClose={() => setPrintTypePickerOpen(false)}
        portalZIndex={(printPortalZIndex ?? 10200) - 50}
        onSelect={handlePrintTypeSelect}
      />
      <PrescriptionPrintModeModal
        open={printModeOpen}
        onClose={() => {
          setPrintModeOpen(false);
          setPrintGate(null);
        }}
        providerConfig={providerConfig}
        medicoId={prescricao.medicoId?.trim() || medicoParaPdf?.id?.trim()}
        isRecibo={prescricao.tipoDocumento === 'recibo_medico'}
        modalTitle={
          prescricao.tipoDocumento === 'recibo_medico'
            ? 'Gerar recibo'
            : printGate?.language === 'en'
              ? printGate?.printType === 'controle_especial'
                ? 'Gerar receituário de controle especial em inglês'
                : 'Gerar prescrição em inglês'
              : printGate?.printType === 'controle_especial'
                ? 'Gerar receituário de controle especial'
                : 'Gerar prescrição'
        }
        portalZIndex={printPortalZIndex}
        onPrintUnsigned={handlePrintUnsigned}
        onPrintSigned={handlePrintSigned}
      />
    </>
  ) : null;

  if (variant === 'panel') {
    if (!prescricao) {
      return (
        <div className="flex h-full min-h-[28rem] w-full flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 text-center shadow-sm dark:border-gray-600 dark:bg-gray-900/40">
          <FileText className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Selecione uma prescrição</p>
          <p className="mt-1 text-xs text-gray-500">O arquivo aparece nesta coluna.</p>
        </div>
      );
    }

    return (
      <>
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-600 dark:bg-gray-900/40">
          <div className="shrink-0 border-b border-gray-200 bg-gradient-to-r from-teal-50/50 via-white to-emerald-50/40 px-4 py-3 dark:border-gray-600 dark:from-teal-950/20 dark:via-gray-900 dark:to-emerald-950/20">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Arquivo
                </p>
                <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {prescricao.nome}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Atualizado em {formatarDataHora(prescricao.atualizadoEm)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenPrint}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700"
              >
                <Printer className="h-4 w-4 shrink-0" />
                Imprimir
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <PrescricaoDocumentoArquivo
              prescricao={prescricao}
              medico={medicoCarregado}
              pacienteNome={pacienteNome}
              pacienteCpf={pacienteCpf}
            />
          </div>
        </div>
        {printModals}
      </>
    );
  }

  if (!prescricao || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-stretch justify-center sm:items-center sm:p-4 bg-black/50`}
      role="presentation"
      onClick={fecharModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prescricao-leitura-titulo"
        className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col overflow-hidden border-gray-200 dark:border-gray-700
          h-[100dvh] max-h-[100dvh] w-full min-h-0 sm:h-auto sm:max-h-[min(90vh,800px)] sm:max-w-2xl sm:rounded-xl shadow-2xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex-shrink-0 flex flex-wrap items-start justify-between gap-2 sm:gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80
            pt-[max(0.75rem,env(safe-area-inset-top))]"
        >
          <div className="min-w-0 flex-1">
            <h3 id="prescricao-leitura-titulo" className="text-base sm:text-lg font-bold text-black dark:text-white line-clamp-2 pr-2">
              {prescricao.nome}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Atualizado em {formatarDataHora(prescricao.atualizadoEm)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenPrint}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
            >
              <Printer className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Imprimir novamente</span>
              <span className="sm:hidden">Imprimir</span>
            </button>
            <button
              type="button"
              onClick={fecharModal}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <PrescricaoDocumentoArquivo
            prescricao={prescricao}
            medico={medicoCarregado}
            pacienteNome={pacienteNome}
            pacienteCpf={pacienteCpf}
          />
        </div>
      </div>
      {printModals}
    </div>,
    document.body
  );
}
