'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import InstagramDepoimentoResultadoSheet from '@/components/instagram/InstagramDepoimentoResultadoSheet';
import type { InstagramDepoimentoItem } from '@/components/instagram/instagramDepoimentosTypes';

type Props = {
  nomeIndicador: string;
  accentColor: string;
  /** Texto sobre o destaque fora do Método. Ausente mantém o navy atual. */
  accentTextColor?: string;
  resultado?: InstagramDepoimentoItem | null;
};

export default function PublicDoctorIndicacao({ nomeIndicador, accentColor, accentTextColor, resultado }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <div
        className="drprov-rise drprov-cta-shimmer rounded-2xl px-4 py-3.5 text-center text-[#0A1F44] shadow-sm"
        style={accentTextColor ? { backgroundColor: accentColor, color: accentTextColor } : { backgroundColor: accentColor }}
      >
        <p className="text-[14px] leading-relaxed">
          <span className="font-semibold">{nomeIndicador}</span> compartilhou este profissional com você
        </p>
        {resultado ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-1.5 text-[13px] font-semibold underline underline-offset-2 hover:opacity-80"
          >
            Veja aqui o resultado do seu acompanhamento
          </button>
        ) : null}
      </div>

      {mounted
        ? createPortal(
            <div className="relative z-[80]">
              <InstagramDepoimentoResultadoSheet
                depoimento={open ? resultado ?? null : null}
                onClose={() => setOpen(false)}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
