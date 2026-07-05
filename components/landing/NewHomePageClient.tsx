'use client';

import React from 'react';
import OftwareHomeHeader from '@/components/landing/OftwareHomeHeader';
import HeroOrbitVisual from '@/components/landing/HeroOrbitVisual';
import { HERO_VARIANT, HERO_COPY } from '@/components/landing/heroCopy';
import CoordenacaoMultidisciplinarSection from '@/components/landing/CoordenacaoMultidisciplinarSection';
import EcossistemaWhatsAppSection from '@/components/landing/EcossistemaWhatsAppSection';
import ProgramasObesidadeMetabolicaSection from '@/components/landing/ProgramasObesidadeMetabolicaSection';
import ClientesWhiteLabelSection from '@/components/landing/ClientesWhiteLabelSection';
import IndicadoresPlataforma from '@/components/landing/IndicadoresPlataforma';
import MentoriaLeadModal from '@/components/mentoria/MentoriaLeadModal';
import { useMentoriaLeadModal } from '@/hooks/useMentoriaLeadModal';
import { useLandingPageVersionBust } from '@/hooks/useLandingPageVersionBust';
import { openOftwareWhatsAppCta } from '@/lib/landing/oftwareWhatsAppCta';
import {
  ArrowRight,
  Shield,
  Bell,
  CalendarCheck,
  Layers,
  Palette,
  Building2,
  Stethoscope,
  Brain,
  PenLine,
  Activity,
  UserCheck,
  LayoutDashboard,
  Globe,
  BarChart3,
  LineChart,
} from 'lucide-react';

const ACCENT_DARK = '#0A1F44';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.22em] mb-4 md:mb-5 text-[#16A34A]">
      {children}
    </p>
  );
}

function SectionTitle({ children, dark = false, className = '' }: { children: React.ReactNode; dark?: boolean; className?: string }) {
  return (
    <h2
      className={`text-3xl sm:text-4xl md:text-[2.75rem] font-bold leading-[1.1] tracking-tight ${
        dark ? 'text-white' : 'text-[#1D1D1D]'
      } ${className}`}
    >
      {children}
    </h2>
  );
}

const PLATAFORMA = [
  { icon: Bell, label: 'Alertas e aplicações' },
  { icon: CalendarCheck, label: 'Check-ins' },
  { icon: Layers, label: 'Protocolos' },
  { icon: Activity, label: 'Exames' },
  { icon: LineChart, label: 'Timeline clínica' },
  { icon: PenLine, label: 'Prescrição digital' },
  { icon: Shield, label: 'Assinatura digital' },
  { icon: Brain, label: 'IA clínica' },
  { icon: UserCheck, label: 'Portal do paciente' },
  { icon: Stethoscope, label: 'Portal médico' },
  { icon: Globe, label: 'White Label' },
  { icon: BarChart3, label: 'Relatórios' },
];

const hero = HERO_COPY[HERO_VARIANT];

export default function NewHomePageClient() {
  const leadModal = useMentoriaLeadModal();
  useLandingPageVersionBust('/');
  const openLead = () => leadModal.open();

  return (
    <div className="min-h-screen bg-white">
      <OftwareHomeHeader onCtaClick={openOftwareWhatsAppCta} />

      <main>
        {/* ─── HERO ─── */}
        <section
          id="inicio"
          className="scroll-mt-[80px] relative min-h-[calc(100dvh-72px)] flex items-center pt-[72px] md:pt-[80px] overflow-x-clip border-b border-white/[0.08]"
          style={{ backgroundColor: ACCENT_DARK }}
        >
          <div className="relative w-full max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12 py-10 md:py-14">
            <div className="grid lg:grid-cols-5 gap-10 lg:gap-8 xl:gap-10 items-center">
              <div className="z-10 lg:col-span-2">
                <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.22em] mb-4 md:mb-5 text-[#4ade80]">
                  Infraestrutura White Label
                </p>
                <h1 className="text-[1.75rem] sm:text-3xl lg:text-[2.5rem] xl:text-[2.85rem] font-bold text-white leading-[1.08] tracking-tight mb-5">
                  {hero.titleLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </h1>
                <p className="text-base md:text-lg text-[#B8C2D1] leading-relaxed mb-8 max-w-lg">
                  {hero.subtitle}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={openOftwareWhatsAppCta}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold text-white bg-[#22C55E] hover:bg-[#16A34A] transition-all shadow-md shadow-[#22C55E]/20 text-sm md:text-base"
                  >
                    Quero minha plataforma
                    <ArrowRight size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToId('demonstracao')}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold text-white border border-white/25 bg-white/5 hover:bg-white/10 transition-all text-sm md:text-base"
                  >
                    Ver demonstração
                  </button>
                </div>
              </div>

              <div className="lg:col-span-3 flex justify-center lg:justify-end">
                <HeroOrbitVisual />
              </div>
            </div>
          </div>
        </section>

        <CoordenacaoMultidisciplinarSection />

        <EcossistemaWhatsAppSection />

        {/* ─── Demonstração: capacidades da plataforma ─── */}
        <section
          id="demonstracao"
          className="scroll-mt-[80px] py-20 md:py-28 bg-white border-t border-[#E5E7EB]"
        >
          <div className="w-full max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12">
            <div className="max-w-2xl mb-12">
              <Eyebrow>A infraestrutura</Eyebrow>
              <SectionTitle className="mb-4">
                Tudo que sua operação clínica precisa. Em um só lugar.
              </SectionTitle>
              <p className="text-lg text-[#5A5A5A] leading-relaxed">
                A Oftware não é um prontuário. É a infraestrutura para coordenar acompanhamento multidisciplinar com
                escala, marca própria e continuidade entre consultas.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {PLATAFORMA.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-[#F7F7F7] px-4 py-4 hover:border-[#22C55E]/40 hover:bg-white transition-colors"
                >
                  <Icon className="w-5 h-5 text-[#16A34A] shrink-0" />
                  <span className="text-sm font-medium text-[#1D1D1D]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Para Médicos + White Label ─── */}
        <section
          id="white-label"
          className="scroll-mt-[80px] py-20 md:py-28 border-t border-white/[0.08]"
          style={{ backgroundColor: ACCENT_DARK }}
        >
          <div id="medicos" className="scroll-mt-[80px] w-full max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Eyebrow>White Label</Eyebrow>
                <SectionTitle dark className="mb-5">Sua marca. Sua plataforma. Sua operação.</SectionTitle>
                <p className="text-[#B8C2D1] text-lg leading-relaxed mb-6">
                  Médicos, clínicas e mentorias constroem sua operação de acompanhamento sobre a Oftware. O paciente vê a
                  sua marca — a tecnologia fica nos bastidores.
                </p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {['Nome próprio', 'Logo', 'Domínio', 'Cores', 'Experiência'].map((t) => (
                    <span key={t} className="rounded-full border border-[#22C55E]/25 bg-[#22C55E]/10 px-4 py-1.5 text-sm text-[#4ade80]">
                      {t}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={openLead}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full font-semibold text-white bg-[#22C55E] hover:bg-[#16A34A] transition-all text-sm"
                >
                  Conhecer White Label
                  <ArrowRight size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Palette, label: 'Identidade visual' },
                  { icon: LayoutDashboard, label: 'Painel médico' },
                  { icon: UserCheck, label: 'App do paciente' },
                  { icon: Building2, label: 'Operação clínica' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#16A34A] to-[#22C55E] flex items-center justify-center mx-auto mb-3">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-white text-sm font-medium">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <ProgramasObesidadeMetabolicaSection />

        <ClientesWhiteLabelSection />

        {/* Indicadores — bloco escuro pontual */}
        <div className="border-t border-white/[0.08]" style={{ backgroundColor: ACCENT_DARK }}>
          <IndicadoresPlataforma variant="institutional" />
        </div>

        {/* ─── CTA ─── */}
        <section id="contato" className="scroll-mt-[80px] py-20 md:py-28 bg-white border-t border-[#E5E7EB]">
          <div className="w-full max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12 text-center">
            <SectionTitle className="mb-5 max-w-3xl mx-auto">
              Adquira uma infraestrutura para construir seu negócio de acompanhamento médico.
            </SectionTitle>
            <p className="text-lg text-[#5A5A5A] max-w-xl mx-auto mb-10">
              A Oftware entrega a plataforma. Você entrega a experiência, a equipe e a marca.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={openOftwareWhatsAppCta}
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full font-semibold text-white bg-[#22C55E] hover:bg-[#16A34A] transition-all shadow-md shadow-[#22C55E]/20 text-lg"
              >
                Quero minha plataforma
                <ArrowRight size={20} />
              </button>
              <button
                type="button"
                onClick={openOftwareWhatsAppCta}
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full font-semibold text-[#1D1D1D] border border-[#E5E7EB] bg-[#F7F7F7] hover:bg-white transition-all text-lg"
              >
                Falar com especialista
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/[0.08] py-14" style={{ backgroundColor: ACCENT_DARK }}>
          <div className="w-full max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12">
            <div className="flex flex-col md:flex-row justify-between gap-10">
              <div className="max-w-sm">
                <img src="/oftware-site-novo2.png" alt="Oftware" className="h-8 md:h-9 w-auto mb-4" />
                <p className="text-[#B8C2D1] text-sm leading-relaxed">
                  Oftware — infraestrutura White Label para acompanhamento médico multidisciplinar.
                </p>
              </div>
              <div className="flex gap-12">
                <div>
                  <h4 className="font-semibold text-white text-sm mb-3">Produtos</h4>
                  <ul className="space-y-2 text-sm">
                    <li><a href="/metodo" className="text-[#B8C2D1] hover:text-[#22C55E] transition-colors">Método Emagrecer</a></li>
                    <li><a href="/mentoria" className="text-[#B8C2D1] hover:text-[#22C55E] transition-colors">Mentoria</a></li>
                    <li><a href="/apresentacao" className="text-[#B8C2D1] hover:text-[#22C55E] transition-colors">Apresentação</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm mb-3">Institucional</h4>
                  <ul className="space-y-2 text-sm">
                    <li><a href="/politica-de-privacidade.html" className="text-[#B8C2D1] hover:text-[#22C55E] transition-colors">Privacidade</a></li>
                    <li><a href="/exclusao-de-dados.html" className="text-[#B8C2D1] hover:text-[#22C55E] transition-colors">Exclusão de dados</a></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-10 pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row justify-between items-center gap-4 text-[#B8C2D1]/60 text-sm">
              <p>© {new Date().getFullYear()} Oftware. Todos os direitos reservados.</p>
              <div className="flex items-center gap-2">
                <Shield size={14} />
                <span>Plataforma segura</span>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <MentoriaLeadModal isOpen={leadModal.isOpen} onClose={leadModal.close} />
    </div>
  );
}
