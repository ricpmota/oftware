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
  UtensilsCrossed,
  Dumbbell,
  Users,
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
  { icon: LineChart, label: 'Evolução e timeline' },
  { icon: PenLine, label: 'Prescrição e orientações' },
  { icon: Shield, label: 'Assinatura digital' },
  { icon: Brain, label: 'Inteligência artificial' },
  { icon: UserCheck, label: 'Portal do paciente' },
  { icon: Stethoscope, label: 'Painel profissional' },
  { icon: Globe, label: 'Marca própria' },
  { icon: BarChart3, label: 'Relatórios' },
];

const FORMAS_LIDERAR = [
  {
    icon: Stethoscope,
    title: 'Médico',
    desc: 'Cria sua estrutura e integra nutricionistas, personais e outros profissionais.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Nutricionista',
    desc: 'Organiza seus pacientes e convida médicos e personais parceiros para oferecer acompanhamento completo.',
  },
  {
    icon: Dumbbell,
    title: 'Personal trainer',
    desc: 'Gerencia a evolução dos clientes e trabalha em conjunto com nutricionistas e médicos parceiros.',
  },
  {
    icon: Building2,
    title: 'Clínica ou instituto',
    desc: 'Centraliza diferentes profissionais, jornadas, pacientes e unidades sob a mesma organização.',
  },
] as const;

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
                  Sua estrutura digital em saúde
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
                    Quero criar minha estrutura
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

        {/* ─── Formas de liderar + rede de parceiros ─── */}
        <section
          id="para-profissionais"
          className="scroll-mt-[80px] py-20 md:py-28 bg-white border-t border-[#E5E7EB]"
        >
          <div className="w-full max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12">
            <div className="max-w-3xl mb-12">
              <Eyebrow>Para profissionais e organizações</Eyebrow>
              <SectionTitle className="mb-4">
                Uma plataforma. Diferentes formas de liderar uma operação.
              </SectionTitle>
              <p className="text-lg text-[#5A5A5A] leading-relaxed mb-6">
                Você lidera a sua operação e escolhe os profissionais que farão parte dela.
              </p>
              <p className="text-base md:text-lg text-[#5A5A5A] leading-relaxed">
                Na Oftware, médicos, nutricionistas e personal trainers podem criar sua própria estrutura, convidar
                profissionais parceiros e oferecer uma jornada integrada aos seus pacientes ou clientes.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {FORMAS_LIDERAR.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-xl border border-[#E5E7EB] bg-[#F7F7F7] px-5 py-6 hover:border-[#22C55E]/40 hover:bg-white transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#22C55E]/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-[#16A34A]" />
                  </div>
                  <h3 className="text-base font-semibold text-[#1D1D1D] mb-2">{title}</h3>
                  <p className="text-sm text-[#5A5A5A] leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F7] p-6 md:p-8 flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-[#22C55E]/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-[#16A34A]" />
              </div>
              <div>
                <p className="text-base md:text-lg font-semibold text-[#1D1D1D] mb-2">
                  Rede de parceiros sob a sua organização
                </p>
                <p className="text-sm md:text-base text-[#5A5A5A] leading-relaxed">
                  Quem cria a organização define sua equipe e seus parceiros. Nutricionistas e personais também podem
                  ser proprietários e gestores — não apenas integrantes de uma equipe médica.
                </p>
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
                Tudo que sua operação de saúde precisa. Em um só lugar.
              </SectionTitle>
              <p className="text-lg text-[#5A5A5A] leading-relaxed">
                A Oftware reúne acompanhamento contínuo, comunicação, equipe multiprofissional, evolução dos pacientes e
                marca própria em uma única estrutura digital.
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

        {/* ─── Marca própria (âncora white-label preservada) ─── */}
        <section
          id="white-label"
          className="scroll-mt-[80px] py-20 md:py-28 border-t border-white/[0.08]"
          style={{ backgroundColor: ACCENT_DARK }}
        >
          <div id="medicos" className="scroll-mt-[80px] w-full max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-12">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Eyebrow>Sua operação, sua marca</Eyebrow>
                <SectionTitle dark className="mb-5">
                  Uma estrutura digital com a identidade do seu negócio.
                </SectionTitle>
                <p className="text-[#B8C2D1] text-lg leading-relaxed mb-4">
                  Profissionais e organizações de saúde podem estruturar toda a jornada de acompanhamento sobre a
                  Oftware. Seus pacientes reconhecem sua marca, sua equipe trabalha integrada e a tecnologia permanece
                  nos bastidores.
                </p>
                <p className="text-[#B8C2D1] text-base leading-relaxed mb-6">
                  Você pode liderar sua organização e convidar médicos, nutricionistas, personal trainers e outros
                  profissionais parceiros.
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {['Nome próprio', 'Logo', 'Domínio próprio', 'Cores', 'Equipe própria', 'Experiência personalizada'].map(
                    (t) => (
                      <span
                        key={t}
                        className="rounded-full border border-[#22C55E]/25 bg-[#22C55E]/10 px-4 py-1.5 text-sm text-[#4ade80]"
                      >
                        {t}
                      </span>
                    )
                  )}
                </div>
                <p className="text-[#B8C2D1]/80 text-sm leading-relaxed mb-8">
                  A tecnologia White Label permite que a experiência seja apresentada com a identidade da sua
                  organização.
                </p>
                <button
                  type="button"
                  onClick={openLead}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full font-semibold text-white bg-[#22C55E] hover:bg-[#16A34A] transition-all text-sm"
                >
                  Conhecer a solução
                  <ArrowRight size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Palette, label: 'Identidade visual' },
                  { icon: LayoutDashboard, label: 'Painel profissional' },
                  { icon: UserCheck, label: 'App do paciente' },
                  { icon: Building2, label: 'Operação de saúde' },
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
              Construa uma operação de saúde que continue além do atendimento.
            </SectionTitle>
            <p className="text-lg text-[#5A5A5A] max-w-xl mx-auto mb-10">
              A Oftware entrega a tecnologia para você organizar sua marca, seus pacientes, sua equipe e sua rede de
              profissionais parceiros em um único ecossistema.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={openOftwareWhatsAppCta}
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full font-semibold text-white bg-[#22C55E] hover:bg-[#16A34A] transition-all shadow-md shadow-[#22C55E]/20 text-lg"
              >
                Quero criar minha estrutura
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
                  Oftware — tecnologia para profissionais e organizações criarem estruturas digitais de acompanhamento
                  em saúde.
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
