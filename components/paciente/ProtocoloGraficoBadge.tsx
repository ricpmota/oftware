'use client';

import { ChevronDown } from 'lucide-react';
import type { ProtocoloTirzepatidaResumo } from '@/utils/tirzepatidaProtocoloDisplay';

type Props = {
  protocolos: ProtocoloTirzepatidaResumo[];
  protocoloIndice: number;
  menuAberto: boolean;
  onToggle: () => void;
  onSelect: (indice: number) => void;
  className?: string;
};

export function ProtocoloGraficoBadge({
  protocolos,
  protocoloIndice,
  menuAberto,
  onToggle,
  onSelect,
  className,
}: Props) {
  return (
    <div className={className ?? 'absolute top-2 right-2 z-10'}>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 rounded-full bg-[#0A1F44] px-2.5 py-1 text-[11px] font-semibold text-[#E8EDED] shadow-sm hover:bg-[#0d2a5a]"
        aria-haspopup="listbox"
        aria-expanded={menuAberto}
        aria-label="Escolher protocolo do gráfico"
      >
        Protocolo {protocoloIndice}
        <ChevronDown
          className={`h-3 w-3 shrink-0 opacity-80 transition-transform ${
            menuAberto ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>
      {menuAberto ? (
        <div
          className="absolute right-0 mt-1 min-w-[168px] overflow-hidden rounded-xl border border-white/15 bg-[#0A1F44] shadow-xl"
          role="listbox"
        >
          {protocolos.map((p) => {
            const selecionado = p.indice === protocoloIndice;
            return (
              <button
                key={p.indice}
                type="button"
                role="option"
                aria-selected={selecionado}
                onClick={() => onSelect(p.indice)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-white/10 ${
                  selecionado ? 'font-semibold text-[#4CCB7A]' : 'text-[#E8EDED]'
                }`}
              >
                Protocolo {p.indice}
                {p.ativo ? ' (atual)' : ''}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
