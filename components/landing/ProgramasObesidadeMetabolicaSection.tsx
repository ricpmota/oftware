'use client';

import React from 'react';
import {
  CalendarClock,
  UtensilsCrossed,
  Dumbbell,
  ClipboardList,
  Route,
  Check,
} from 'lucide-react';

const ACCENT_DARK = '#0A1F44';

const CAPACIDADES = [
  {
    icon: CalendarClock,
    title: 'Aplicações e Protocolos',
    desc: 'Organize aplicações, protocolos injetáveis, calendário e adesão ao tratamento.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Nutrição Integrada',
    desc: 'Nutricionistas registram evolução, orientações e acompanham o paciente na mesma jornada.',
  },
  {
    icon: Dumbbell,
    title: 'Exercício e Performance',
    desc: 'Personal trainers acompanham treinos, adesão e evolução física.',
  },
  {
    icon: ClipboardList,
    title: 'Acompanhamento Médico',
    desc: 'Prescrições, exames, evolução clínica e condutas centralizadas.',
  },
  {
    icon: Route,
    title: 'Jornada do Paciente',
    desc: 'Todos os registros conectados em uma única linha do tempo.',
  },
] as const;

const REQUISITOS = [
  'adesão',
  'continuidade',
  'acompanhamento',
  'coordenação multidisciplinar',
  'monitoramento de longo prazo',
] as const;

export default function ProgramasObesidadeMetabolicaSection() {
  return (
    <section
      id="programas"
      className="scroll-mt-[80px] py-20 md:py-28 lg:py-32 bg-white border-t border-[#E5E7EB] relative overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 55% 40% at 70% 20%, rgba(34, 197, 94, 0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12">
        {/* Cabeçalho */}
        <div className="max-w-3xl mb-14 md:mb-20">
          <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.22em] text-[#16A34A] mb-5">
            Medicina metabólica
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1D1D1D] leading-[1.1] tracking-tight mb-6">
            Construída para programas de obesidade e medicina metabólica.
          </h2>
          <p className="text-lg md:text-xl text-[#5A5A5A] leading-relaxed mb-4">
            A obesidade é uma doença crônica que exige acompanhamento contínuo, coordenação multidisciplinar e
            adesão de longo prazo.
          </p>
          <p className="text-lg md:text-xl text-[#5A5A5A] leading-relaxed">
            A Oftware foi criada para organizar toda essa jornada em uma única plataforma.
          </p>
        </div>

        {/* Cards — 3 + 2 centralizados no desktop */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-5 md:gap-6 mb-14 md:mb-20">
          {CAPACIDADES.map(({ icon: Icon, title, desc }, index) => (
            <div
              key={title}
              className={`group flex flex-col rounded-2xl border border-[#E5E7EB] bg-[#F7F7F7] p-8 md:p-10 hover:border-[#22C55E]/35 hover:bg-white hover:shadow-lg hover:shadow-[#22C55E]/5 transition-all duration-300 lg:col-span-2 ${
                index === 3 ? 'lg:col-start-2' : index === 4 ? 'lg:col-start-4' : ''
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#16A34A] to-[#22C55E] flex items-center justify-center mb-6 shadow-md shadow-[#22C55E]/15 group-hover:scale-105 transition-transform">
                <Icon className="w-7 h-7 text-white" strokeWidth={1.75} />
              </div>
              <h3 className="text-xl md:text-[1.35rem] font-semibold text-[#1D1D1D] mb-3 leading-snug">{title}</h3>
              <p className="text-[#5A5A5A] text-base leading-relaxed flex-1">{desc}</p>
            </div>
          ))}
        </div>

        {/* Bloco de destaque */}
        <div
          className="rounded-3xl border border-white/[0.08] p-8 md:p-12 lg:p-14 mb-14 md:mb-20"
          style={{ backgroundColor: ACCENT_DARK }}
        >
          <div className="max-w-3xl">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-[1.15] tracking-tight mb-5">
              O diferencial não está na prescrição.
            </h3>
            <p className="text-xl md:text-2xl font-semibold text-[#4ade80] mb-6">O diferencial está na coordenação.</p>
            <p className="text-base md:text-lg text-[#B8C2D1] leading-relaxed">
              Enquanto a maioria das soluções acompanha apenas uma parte do tratamento, a Oftware conecta paciente,
              médico, nutricionista e personal em uma única jornada clínica.
            </p>
          </div>
        </div>

        {/* Frase de impacto */}
        <blockquote className="text-center max-w-4xl mx-auto mb-14 md:mb-20 px-2">
          <p className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] font-bold text-[#1D1D1D] leading-[1.2] tracking-tight">
            <span className="block">A obesidade não é tratada em uma consulta.</span>
            <span className="block mt-2 md:mt-3 text-[#16A34A]">Ela é tratada ao longo de uma jornada.</span>
          </p>
        </blockquote>

        {/* Mensagem final */}
        <div className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F7] p-8 md:p-12 lg:p-14 max-w-4xl mx-auto">
          <p className="text-lg md:text-xl font-semibold text-[#1D1D1D] mb-8 leading-relaxed">
            A Oftware foi desenvolvida para programas que exigem:
          </p>
          <ul className="grid sm:grid-cols-2 gap-4 md:gap-5">
            {REQUISITOS.map((item) => (
              <li key={item} className="flex items-center gap-3 text-[#1D1D1D] text-base md:text-lg">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#22C55E]/10 shrink-0">
                  <Check className="w-4 h-4 text-[#16A34A]" strokeWidth={2.5} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
