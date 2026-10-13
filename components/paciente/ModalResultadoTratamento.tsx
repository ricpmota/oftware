'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Link as LinkIcon, Printer, X } from 'lucide-react';
import { EvolucaoTratamentoChart } from '@/components/EvolucaoTratamentoChart';
import { ProtocoloGraficoBadge } from '@/components/paciente/ProtocoloGraficoBadge';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  buildDepoimentoResultadoFromPaciente,
  type DepoimentoResultadoModalData,
} from '@/utils/buildDepoimentoResultadoFromPaciente';
import { listarProtocolosTirzepatida } from '@/utils/tirzepatidaProtocoloDisplay';

type Props = {
  open: boolean;
  data: DepoimentoResultadoModalData | null;
  onClose: () => void;
  /** z-index acima do modal Gráfico e Registros (9999). */
  zIndexClass?: string;
  /** Quando informado, o gráfico pode filtrar por protocolo. */
  paciente?: PacienteCompleto | null;
  estrelas?: number;
};

export function ModalResultadoTratamento({
  open,
  data,
  onClose,
  zIndexClass = 'z-[10050]',
  paciente = null,
  estrelas = 0,
}: Props) {
  const jpgRef = useRef<HTMLDivElement>(null);
  const printableRef = useRef<HTMLDivElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showProtocoloMenu, setShowProtocoloMenu] = useState(false);
  const protocolos = useMemo(
    () => (paciente ? listarProtocolosTirzepatida(paciente) : []),
    [paciente]
  );
  const [protocoloIndice, setProtocoloIndice] = useState(1);

  useEffect(() => {
    if (!open) return;
    const last = protocolos[protocolos.length - 1]?.indice ?? 1;
    setProtocoloIndice(last);
    setShowProtocoloMenu(false);
  }, [open, paciente?.id]);

  const d = useMemo(() => {
    if (!paciente) return data;
    return buildDepoimentoResultadoFromPaciente(paciente, estrelas, data?.depoimento ?? '', {
      protocoloIndice,
    });
  }, [paciente, estrelas, data, protocoloIndice]);

  const handleClose = useCallback(() => {
    setShowExportMenu(false);
    setShowProtocoloMenu(false);
    onClose();
  }, [onClose]);

  const exportarJpg = useCallback(async () => {
    setShowProtocoloMenu(false);
    const alvo = printableRef.current ?? jpgRef.current;
    if (!alvo) return;
    try {
      const canvas = await html2canvas(alvo, {
        backgroundColor: '#0A1F44',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
      });
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.95)
      );
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'resultado-tratamento.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar resultado do tratamento:', err);
    }
  }, []);

  if (!open || !d) return null;

  const mostrarSeletorProtocolo = protocolos.length > 1;

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-black/50 lg:p-4`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-resultado-tratamento-titulo"
    >
      <div
        ref={jpgRef}
        className="bg-[#0A1F44] w-full h-full overflow-y-auto p-4 sm:p-6 relative animate-modal-enter lg:h-auto lg:max-h-[90vh] lg:max-w-4xl lg:rounded-2xl lg:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <img
            src="/metodo-emagrecer-logotipo-26.png"
            alt="Método Emagrecer"
            crossOrigin="anonymous"
            className="h-10 sm:h-12 w-auto object-contain"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowProtocoloMenu(false);
                setShowExportMenu((v) => !v);
              }}
              className="text-[#E8EDED]/60 hover:text-[#E8EDED]"
              aria-label="Exportar screenshot em JPG"
              title="Exportar"
            >
              <Printer className="w-6 h-6" />
            </button>
            {showExportMenu && (
              <div className="absolute top-14 right-14 z-[10060] min-w-[180px] rounded-xl border border-white/15 bg-[#0A1F44] shadow-xl p-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    void exportarJpg();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#E8EDED] hover:bg-white/10"
                >
                  Baixar em JPG
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="text-[#E8EDED]/60 hover:text-[#E8EDED]"
              aria-label="Fechar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div ref={printableRef}>
          <h3
            id="modal-resultado-tratamento-titulo"
            className="text-lg font-bold text-[#E8EDED] mb-2"
          >
            Resultado do tratamento
          </h3>
          <p className="text-sm text-[#E8EDED]/75 mb-4">
            {d.nome}
            {(d.cidadeEstado || d.idade != null) && (
              <>
                {' · '}
                {[d.cidadeEstado, d.idade != null ? `${d.idade} anos` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </>
            )}
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div className="rounded-lg p-3 border border-[#4CCB7A]/30 bg-[#4CCB7A]/10">
              <p className="text-xs text-[#4CCB7A] font-medium">Peso inicial</p>
              <p className="text-lg font-semibold text-[#E8EDED]">
                {d.pesoInicialKg != null ? `${d.pesoInicialKg.toFixed(1)} kg` : '—'}
              </p>
              {d.metaPesoKgLoss != null && d.metaPesoKgLoss > 0 ? (
                <p className="text-[10px] text-[#4CCB7A]/80 mt-0.5">
                  Meta: −{d.metaPesoKgLoss.toFixed(1).replace(/\.0$/, '')} kg
                </p>
              ) : null}
            </div>
            <div className="rounded-lg p-3 border border-[#4CCB7A]/30 bg-[#4CCB7A]/10">
              <p className="text-xs text-[#4CCB7A] font-medium">Peso atual</p>
              <p className="text-lg font-semibold text-[#E8EDED]">
                {d.pesoAtualKg != null ? `${d.pesoAtualKg.toFixed(1)} kg` : '—'}
              </p>
            </div>
            <div className="rounded-lg p-3 border border-[#4CCB7A]/30 bg-[#4CCB7A]/10">
              <p className="text-xs text-[#4CCB7A] font-medium">Perda total (kg)</p>
              <p className="text-lg font-semibold text-[#E8EDED]">
                {d.perdaTotalKg != null ? `-${d.perdaTotalKg.toFixed(1)} kg` : '—'}
              </p>
            </div>
            <div className="rounded-lg p-3 border border-[#4CCB7A]/30 bg-[#4CCB7A]/10">
              <p className="text-xs text-[#4CCB7A] font-medium">Perda Percentual (kg)</p>
              <p className="text-lg font-semibold text-[#E8EDED]">
                {d.perdaPercentual != null ? `-${d.perdaPercentual.toFixed(1)}%` : '—'}
              </p>
            </div>
            <div className="rounded-lg p-3 border border-[#2F8FA3]/35 bg-[#2F8FA3]/15">
              <p className="text-xs text-[#7BD7EA] font-medium">Perda abdominal (cm)</p>
              <p className="text-lg font-semibold text-[#E8EDED]">
                {d.perdaAbdominalCm != null ? `-${d.perdaAbdominalCm.toFixed(1)} cm` : '—'}
              </p>
              {d.metaAbdominalCmLoss != null && d.metaAbdominalCmLoss > 0 ? (
                <p className="text-[10px] text-[#7BD7EA]/80 mt-0.5">
                  Meta: −{d.metaAbdominalCmLoss.toFixed(1).replace(/\.0$/, '')} cm
                </p>
              ) : null}
            </div>
            <div className="rounded-lg p-3 border border-[#2F8FA3]/35 bg-[#2F8FA3]/15">
              <p className="text-xs text-[#7BD7EA] font-medium">Perda Percentual (cm)</p>
              <p className="text-lg font-semibold text-[#E8EDED]">
                {d.perdaPercentualAbdominal != null
                  ? `-${d.perdaPercentualAbdominal.toFixed(1)}%`
                  : '—'}
              </p>
            </div>
          </div>

          {d.evolucao.length > 0 ? (
            <div
              className={`relative flex flex-col rounded-xl border border-[#d1d5db] bg-[#E8EDED] p-3 sm:p-4 ${
                mostrarSeletorProtocolo ? '[&_h4]:pr-28' : ''
              }`}
            >
              {mostrarSeletorProtocolo ? (
                <ProtocoloGraficoBadge
                  protocolos={protocolos}
                  protocoloIndice={protocoloIndice}
                  menuAberto={showProtocoloMenu}
                  onToggle={() => {
                    setShowExportMenu(false);
                    setShowProtocoloMenu((v) => !v);
                  }}
                  onSelect={(indice) => {
                    setProtocoloIndice(indice);
                    setShowProtocoloMenu(false);
                  }}
                />
              ) : null}
              <EvolucaoTratamentoChart
                evolucao={d.evolucao}
                pacienteId={d.pacienteId}
                invertedModal={false}
              />
            </div>
          ) : mostrarSeletorProtocolo ? (
            <div className="relative mb-2 h-8">
              <ProtocoloGraficoBadge
                protocolos={protocolos}
                protocoloIndice={protocoloIndice}
                menuAberto={showProtocoloMenu}
                onToggle={() => {
                  setShowExportMenu(false);
                  setShowProtocoloMenu((v) => !v);
                }}
                onSelect={(indice) => {
                  setProtocoloIndice(indice);
                  setShowProtocoloMenu(false);
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Botão no estilo do metaadmin para abrir o modal de compartilhar/resultado. */
export function BotaoCompartilharResultadoTratamento({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200 hover:bg-blue-200 transition-colors"
    >
      <LinkIcon className="h-3.5 w-3.5 shrink-0" />
      Compartilhar
    </button>
  );
}
