'use client';

import { createPortal } from 'react-dom';
import { Home, MapPin, X } from 'lucide-react';
import type { ContratoOpcaoEntregaMaterial } from '@/lib/contratos/contratoOpcaoEntregaMaterial';
import { CONTRATO_OPCAO_ENTREGA_LABELS } from '@/lib/contratos/contratoOpcaoEntregaMaterial';

export type ContratoPacienteOpcaoEntregaModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (opcao: ContratoOpcaoEntregaMaterial) => void;
  loading?: boolean;
};

const OPCOES: {
  id: ContratoOpcaoEntregaMaterial;
  icon: typeof Home;
  descricao: string;
}[] = [
  {
    id: 'domicilio',
    icon: Home,
    descricao: CONTRATO_OPCAO_ENTREGA_LABELS.domicilio,
  },
  {
    id: 'clinica',
    icon: MapPin,
    descricao: CONTRATO_OPCAO_ENTREGA_LABELS.clinica,
  },
];

export default function ContratoPacienteOpcaoEntregaModal({
  open,
  onClose,
  onConfirm,
  loading = false,
}: ContratoPacienteOpcaoEntregaModalProps) {
  if (!open || typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contrato-opcao-titulo"
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0A1F44] text-[#E8EDED] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <h2 id="contrato-opcao-titulo" className="text-lg font-bold">
              Como deseja receber o tratamento?
            </h2>
            <p className="mt-1 text-sm text-[#E8EDED]/70">
              Escolha uma opção antes de assinar. Seu contrato será preparado com sua escolha.
            </p>
          </div>
          {!loading && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/15 p-2 hover:bg-white/10"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="space-y-3 px-5 py-4">
          {OPCOES.map(({ id, icon: Icon, descricao }) => (
            <button
              key={id}
              type="button"
              disabled={loading}
              onClick={() => onConfirm(id)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-4 text-left transition-colors hover:border-[#4CCB7A]/50 hover:bg-[#4CCB7A]/10 disabled:opacity-60"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#4CCB7A]/15 text-[#4CCB7A]">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-base font-semibold">{descricao}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
