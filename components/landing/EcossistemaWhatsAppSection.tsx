'use client';

import { X, CheckCircle2 } from 'lucide-react';

const MERCADO = [
  'Equipe fragmentada entre WhatsApp e planilhas',
  'Informações perdidas entre consultas',
  'Cada profissional vê apenas parte da jornada',
];

const OFTWARE = [
  'Paciente, médico, nutri e personal conectados',
  'Mesmo prontuário compartilhado',
  'Mesma evolução visível para toda a equipe',
];

export default function EcossistemaWhatsAppSection() {
  return (
    <section
      id="ecossistema"
      className="scroll-mt-[80px] py-20 md:py-28 bg-[#F7F7F7] border-t border-[#E5E7EB]"
    >
      <div className="w-full max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="max-w-2xl mb-10 md:mb-12">
          <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.22em] text-[#16A34A] mb-4 md:mb-5">
            O ecossistema conectado
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold leading-[1.1] tracking-tight text-[#1D1D1D]">
            Pare de coordenar tratamento pelo WhatsApp.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-5 md:gap-6">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 md:p-9">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-5">Hoje no mercado</p>
            <ul className="space-y-4">
              {MERCADO.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[#5A5A5A] text-sm md:text-base leading-relaxed">
                  <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#22C55E]/25 bg-white p-8 md:p-9">
            <p className="text-xs font-bold uppercase tracking-wider text-[#16A34A] mb-5">Na Oftware</p>
            <ul className="space-y-4">
              {OFTWARE.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[#1D1D1D] text-sm md:text-base leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
