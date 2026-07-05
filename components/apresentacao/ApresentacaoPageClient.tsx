'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import LandingPageHeader from '@/components/landing/LandingPageHeader';
import InitialLoadingSplash from '@/components/landing/InitialLoadingSplash';
import IndicadoresPlataforma from '@/components/landing/IndicadoresPlataforma';
import MentoriaLeadModal from '@/components/mentoria/MentoriaLeadModal';
import { useMentoriaLeadModal } from '@/hooks/useMentoriaLeadModal';
import {
  ArrowRight,
  Shield,
  AlertTriangle,
  Bell,
  CalendarCheck,
  ClipboardList,
  TrendingUp,
  Users,
  Layers,
  Palette,
  Building2,
  GraduationCap,
  Wallet,
  BarChart3,
  FlaskConical,
  HeartHandshake,
  Clock,
  FileText,
  Stethoscope,
  Brain,
  PenLine,
  Scale,
  Activity,
  UtensilsCrossed,
  ChevronRight,
  Sparkles,
  UserCheck,
  Target,
} from 'lucide-react';

const DEEP_BLUE = '#0A1F44';

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  centered = true,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  centered?: boolean;
}) {
  return (
    <div className={`mb-10 md:mb-12 max-w-3xl ${centered ? 'mx-auto text-center' : ''}`}>
      {eyebrow && (
        <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-[#4CCB7A]/90 mb-3">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl md:text-4xl font-bold text-[#E8EDED] leading-tight">{title}</h2>
      {subtitle && <p className="mt-4 text-[#E8EDED]/70 text-base md:text-lg leading-relaxed">{subtitle}</p>}
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6 hover:border-[#4CCB7A]/35 hover:bg-white/[0.07] transition-all duration-300">
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="text-[#E8EDED] font-semibold text-base md:text-lg mb-1">{title}</h3>
      {description && <p className="text-[#E8EDED]/65 text-sm leading-relaxed">{description}</p>}
    </div>
  );
}

function ImpactQuote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="mt-10 md:mt-12 rounded-2xl border border-[#4CCB7A]/30 bg-gradient-to-r from-[#4CCB7A]/10 to-[#2F8FA3]/10 px-6 py-5 md:px-8 md:py-6 text-center">
      <p className="text-lg md:text-xl font-semibold text-[#E8EDED] leading-snug">{children}</p>
    </blockquote>
  );
}

const PROBLEMA_CARDS = [
  'Esquecimento da aplicação',
  'Aplicação no dia errado',
  'Falta de registro de peso e medidas',
  'Baixa adesão ao tratamento',
  'Efeitos colaterais não comunicados',
  'Retornos desorganizados',
  'Abandono entre consultas',
];

const SOLUCAO_CARDS = [
  { icon: Bell, title: 'Alerta diário de aplicação' },
  { icon: CalendarCheck, title: 'Lembretes de medicação' },
  { icon: ClipboardList, title: 'Check-in do paciente' },
  { icon: Scale, title: 'Registro de peso e cintura' },
  { icon: FileText, title: 'Solicitação e acompanhamento de exames' },
  { icon: UtensilsCrossed, title: 'Recomendações alimentares e de atividade física' },
  { icon: Activity, title: 'Timeline clínica' },
  { icon: BarChart3, title: 'Painel médico inteligente' },
];

const WHITE_LABEL_BRANDS = [
  { name: 'Clínica Alpha', accent: 'from-blue-500/80 to-blue-700/80', initial: 'A' },
  { name: 'Método Beta', accent: 'from-emerald-500/80 to-teal-600/80', initial: 'B' },
  { name: 'Instituto Gamma', accent: 'from-violet-500/80 to-purple-700/80', initial: 'G' },
  { name: 'Protocolo Dr. João', accent: 'from-amber-500/80 to-orange-600/80', initial: 'J' },
];

const MENTORIA_CARDS = [
  { icon: GraduationCap, title: 'Mentoria + Plataforma', desc: 'Conhecimento e operação no mesmo pacote.' },
  { icon: Layers, title: 'Protocolo + Tecnologia', desc: 'Método clínico com execução digital estruturada.' },
  { icon: Clock, title: 'Método + Acompanhamento diário', desc: 'Continuidade entre consultas, não só conteúdo.' },
  { icon: Users, title: 'Comunidade médica + Receita recorrente', desc: 'Rede de médicos com monetização previsível.' },
];

const INVESTIDOR_ITENS = [
  'Taxa de implantação',
  'Mensalidade recorrente',
  'Plano premium',
  'Certificação',
  'Suporte avançado',
  'Participação por médico ativo',
  'Participação por paciente acompanhado',
];

const MEDICO_BENEFICIOS = [
  'Mais retenção',
  'Mais adesão',
  'Mais previsibilidade',
  'Mais organização',
  'Maior ticket médio',
  'Melhor experiência do paciente',
  'Menos trabalho manual',
];

const PACIENTE_BENEFICIOS = [
  'Recebe alertas',
  'Sabe o dia da aplicação',
  'Registra evolução',
  'Recebe orientações',
  'Mantém vínculo com a equipe',
  'Tem mais segurança durante o tratamento',
];

const ESCALA_ETAPAS = [
  { de: '1 médico', para: '100 pacientes', pacientes: 100 },
  { de: '100 médicos', para: '10.000 pacientes', pacientes: 10000 },
  { de: '1.000 médicos', para: '100.000 pacientes', pacientes: 100000 },
];

const DEMO_PACIENTE = [
  { icon: Bell, label: 'Alertas de aplicação' },
  { icon: ClipboardList, label: 'Check-ins' },
  { icon: Scale, label: 'Peso e cintura' },
  { icon: UtensilsCrossed, label: 'Recomendações' },
];

const DEMO_MEDICO = [
  { icon: Activity, label: 'Timeline' },
  { icon: FileText, label: 'Prontuário' },
  { icon: FlaskConical, label: 'Exames' },
  { icon: Brain, label: 'IA assistiva' },
  { icon: PenLine, label: 'Prescrição' },
  { icon: Shield, label: 'Assinatura digital' },
];

export default function ApresentacaoPageClient() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const leadModal = useMentoriaLeadModal();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      timeoutId = setTimeout(() => setLoading(false), 100);
    });
    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleAccessPath = useCallback(async (path: string) => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      window.location.href = path;
    } catch {
      window.location.href = path;
    }
  }, []);

  if (loading) {
    return <InitialLoadingSplash backgroundColor={DEEP_BLUE} />;
  }

  return (
    <div className="min-h-screen metaadmin-home-dark-scroll" style={{ backgroundColor: DEEP_BLUE }}>
      <LandingPageHeader user={user} onLogout={handleLogout} onAccessPath={handleAccessPath} />

      <main className="relative z-10 pt-[72px] md:pt-[80px]">
        <div
          className="fixed top-[72px] md:top-[80px] right-0 z-[25] flex items-start justify-end p-3 sm:p-5 pointer-events-none"
          aria-hidden
        >
          <img src="/simbolo-metodo.png" alt="" className="w-[min(200px,35vw)] h-auto opacity-[0.07]" />
        </div>

        {/* 1. Hero */}
        <section id="hero" className="relative overflow-hidden py-16 md:py-24 lg:py-28">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A1F44] via-[#0d2a5a] to-[#0A1F44]" />
          <div className="absolute inset-0 opacity-20">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full animate-float"
                style={{
                  left: `${(i * 9) % 100}%`,
                  top: `${(i * 11) % 100}%`,
                  width: `${36 + i * 6}px`,
                  height: `${36 + i * 6}px`,
                  background: 'linear-gradient(135deg, rgba(76, 203, 122, 0.3), rgba(47, 143, 163, 0.2))',
                  animationDelay: `${i * 0.4}s`,
                }}
              />
            ))}
          </div>
          <div className="relative w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-[#4CCB7A]/30 bg-[#4CCB7A]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#4CCB7A] mb-6">
                  <Sparkles className="w-3.5 h-3.5" />
                  White Label · B2B · Mentoria médica
                </p>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[3.25rem] font-bold text-[#E8EDED] leading-[1.15] mb-6">
                  Oftware White Label: transforme sua mentoria médica em uma{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4CCB7A] to-[#2F8FA3]">
                    plataforma escalável
                  </span>{' '}
                  de acompanhamento de pacientes
                </h1>
                <p className="text-lg md:text-xl text-[#E8EDED]/80 mb-8 max-w-xl leading-relaxed">
                  Entregue aos seus mentorados uma tecnologia pronta para acompanhar pacientes todos os dias,
                  aumentar adesão, melhorar retenção e criar receita recorrente.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="button"
                    onClick={() => scrollToId('investidor')}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all shadow-lg hover:shadow-[#4CCB7A]/30"
                  >
                    Ver oportunidade
                    <ArrowRight size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToId('plataforma')}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-[#E8EDED] border-2 border-[#E8EDED]/40 hover:border-[#4CCB7A] hover:text-[#4CCB7A] transition-all"
                  >
                    Conhecer a plataforma
                  </button>
                </div>
              </div>
              <div className="relative">
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-2xl">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#4CCB7A]/90 mb-4">
                    Infraestrutura, não apenas app
                  </p>
                  <div className="space-y-3">
                    {[
                      { icon: Stethoscope, label: 'Operação médica digital', sub: 'Painel, prontuário e timeline' },
                      { icon: UserCheck, label: 'Jornada diária do paciente', sub: 'Alertas, check-ins e evolução' },
                      { icon: Palette, label: 'Marca própria do parceiro', sub: 'Nome, logo e cores individuais' },
                      { icon: TrendingUp, label: 'Modelo escalável', sub: 'Mentoria + tecnologia + recorrência' },
                    ].map(({ icon: Icon, label, sub }) => (
                      <div
                        key={label}
                        className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-[#E8EDED] font-medium text-sm">{label}</p>
                          <p className="text-[#E8EDED]/55 text-xs mt-0.5">{sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Problema */}
        <section id="problema" className="py-16 md:py-24 bg-white/[0.03]">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              eyebrow="O problema"
              title={
                <>
                  O paciente não abandona apenas o tratamento.
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4CCB7A] to-[#2F8FA3]">
                    Ele abandona o acompanhamento.
                  </span>
                </>
              }
              subtitle="Médicos investem em formação, marketing e aquisição de pacientes. Mas, depois da consulta, grande parte do acompanhamento se perde."
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {PROBLEMA_CARDS.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-500/5 p-4 md:p-5"
                >
                  <AlertTriangle className="w-5 h-5 text-red-300/80 shrink-0 mt-0.5" />
                  <p className="text-[#E8EDED]/85 text-sm md:text-base">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Solução */}
        <section id="solucao" className="py-16 md:py-24">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              eyebrow="A solução"
              title="Um acompanhamento que acontece todos os dias, não apenas na consulta."
              subtitle="O Método Emagrecer da Oftware transforma o tratamento em uma jornada acompanhada diariamente, com alertas, check-ins, lembretes, evolução clínica e comunicação estruturada."
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {SOLUCAO_CARDS.map(({ icon, title }) => (
                <FeatureCard key={title} icon={icon} title={title} />
              ))}
            </div>
            <ImpactQuote>
              &ldquo;Nós não vendemos um app de emagrecimento. Nós entregamos uma máquina de adesão ao tratamento.&rdquo;
            </ImpactQuote>
          </div>
        </section>

        {/* 4. White Label */}
        <section id="white-label" className="py-16 md:py-24 bg-white/[0.03]">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              eyebrow="White Label"
              title="Cada médico com sua própria marca. Uma única tecnologia por trás."
              subtitle="O parceiro ou mentor pode oferecer aos seus mentorados uma plataforma própria, com nome, logo, cores e identidade visual individual."
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
              {WHITE_LABEL_BRANDS.map((brand) => (
                <div
                  key={brand.name}
                  className="rounded-2xl border border-white/10 bg-[#0A1F44] overflow-hidden shadow-xl hover:border-[#4CCB7A]/30 transition-colors"
                >
                  <div className={`h-24 bg-gradient-to-br ${brand.accent} flex items-center justify-center`}>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold text-white">
                      {brand.initial}
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <p className="font-semibold text-[#E8EDED]">{brand.name}</p>
                    <div className="space-y-1.5">
                      <div className="h-2 rounded-full bg-white/10 w-full" />
                      <div className="h-2 rounded-full bg-white/10 w-4/5" />
                      <div className="h-8 rounded-lg bg-white/5 border border-white/10 mt-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-[#2F8FA3]/30 bg-gradient-to-r from-[#2F8FA3]/10 to-transparent p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#2F8FA3]/20 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-[#2F8FA3]" />
              </div>
              <p className="text-[#E8EDED]/85 text-base md:text-lg leading-relaxed">
                O paciente <strong className="text-[#E8EDED] font-semibold">não precisa ver a marca Oftware</strong>.
                Ele vê a marca do médico, da clínica ou do método.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Mentorias */}
        <section id="mentorias" className="py-16 md:py-24">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              eyebrow="Modelo para mentorias"
              title="Sua mentoria deixa de entregar apenas conhecimento e passa a entregar operação."
              subtitle="O mentor ensina o método. O médico aplica. O Oftware escala."
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {MENTORIA_CARDS.map(({ icon, title, desc }) => (
                <FeatureCard key={title} icon={icon} title={title} description={desc} />
              ))}
            </div>
          </div>
        </section>

        {/* Indicadores reais da plataforma */}
        <IndicadoresPlataforma />

        {/* 6. Investidor */}
        <section id="investidor" className="py-16 md:py-24 bg-white/[0.03]">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <SectionHeader
                  eyebrow="Para investidor e parceiro"
                  title="Uma nova fonte de receita para quem já tem distribuição."
                  subtitle="O investidor ou mentor que já possui uma base de médicos pode agregar uma plataforma White Label à sua esteira de produtos."
                  centered={false}
                />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
                <p className="text-sm font-semibold text-[#4CCB7A] mb-4 uppercase tracking-wider">Possibilidades de monetização</p>
                <ul className="space-y-3">
                  {INVESTIDOR_ITENS.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-[#E8EDED]/85">
                      <span className="w-6 h-6 rounded-full bg-[#4CCB7A]/15 flex items-center justify-center shrink-0">
                        <Wallet className="w-3.5 h-3.5 text-[#4CCB7A]" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Médico */}
        <section id="medico" className="py-16 md:py-24">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              eyebrow="Para o médico"
              title="O médico ganha uma operação digital pronta."
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {MEDICO_BENEFICIOS.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-[#4CCB7A]/20 bg-[#4CCB7A]/5 px-4 py-4"
                >
                  <Target className="w-5 h-5 text-[#4CCB7A] shrink-0" />
                  <span className="text-[#E8EDED] font-medium text-sm md:text-base">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. Paciente */}
        <section id="paciente" className="py-16 md:py-24 bg-white/[0.03]">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              eyebrow="Para o paciente"
              title="O paciente se sente acompanhado entre as consultas."
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PACIENTE_BENEFICIOS.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-[#2F8FA3]/25 bg-[#2F8FA3]/5 px-4 py-4"
                >
                  <HeartHandshake className="w-5 h-5 text-[#2F8FA3] shrink-0" />
                  <span className="text-[#E8EDED] font-medium text-sm md:text-base">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 9. Escala */}
        <section id="escala" className="py-16 md:py-24">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              eyebrow="Escala"
              title="De um médico para milhares de pacientes."
              subtitle="A tecnologia permite escalar acompanhamento clínico sem aumentar a equipe na mesma proporção."
            />
            <div className="max-w-2xl mx-auto space-y-4">
              {ESCALA_ETAPAS.map((etapa, index) => (
                <div key={etapa.para} className="relative">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
                    <div className="flex-1">
                      <p className="text-[#E8EDED]/60 text-sm mb-1">Nível {index + 1}</p>
                      <p className="text-[#E8EDED] font-semibold text-lg">
                        {etapa.de}{' '}
                        <ChevronRight className="inline w-5 h-5 text-[#4CCB7A] mx-1 align-middle" />
                        {etapa.para}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#4CCB7A] to-[#2F8FA3] tabular-nums">
                        {etapa.pacientes.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-xs text-[#E8EDED]/50">pacientes acompanhados</p>
                    </div>
                  </div>
                  {index < ESCALA_ETAPAS.length - 1 && (
                    <div className="flex justify-center py-2" aria-hidden>
                      <div className="w-px h-6 bg-gradient-to-b from-[#4CCB7A]/50 to-transparent" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 10. Demonstração */}
        <section id="plataforma" className="py-16 md:py-24 bg-white/[0.03]">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              eyebrow="Demonstração"
              title="A plataforma em duas perspectivas."
              subtitle="Experiência estruturada para quem acompanha e para quem conduz o tratamento — com dados, rotina e comunicação integrados."
            />
            <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
              <div className="rounded-2xl border border-[#2F8FA3]/30 bg-gradient-to-b from-[#2F8FA3]/10 to-transparent p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#2F8FA3] flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#2F8FA3] font-semibold">Visão paciente</p>
                    <p className="text-[#E8EDED] font-semibold">Rotina e adesão no dia a dia</p>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#0A1F44]/80 p-4 space-y-3">
                  {DEMO_PACIENTE.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
                      <Icon className="w-4 h-4 text-[#4CCB7A]" />
                      <span className="text-sm text-[#E8EDED]/90">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-[#4CCB7A]/30 bg-gradient-to-b from-[#4CCB7A]/10 to-transparent p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-[#4CCB7A] flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-[#0A1F44]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#4CCB7A] font-semibold">Visão médico</p>
                    <p className="text-[#E8EDED] font-semibold">Operação clínica e decisão</p>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#0A1F44]/80 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DEMO_MEDICO.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
                      <Icon className="w-4 h-4 text-[#4CCB7A]" />
                      <span className="text-sm text-[#E8EDED]/90">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 11. CTA final */}
        <section id="parceria" className="py-16 md:py-24">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-[#4CCB7A]/30 bg-gradient-to-br from-[#4CCB7A]/15 via-[#0A1F44] to-[#2F8FA3]/15 p-8 md:p-12 lg:p-16 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4CCB7A] mb-4">Parceria estratégica</p>
              <h2 className="text-3xl md:text-4xl font-bold text-[#E8EDED] mb-4 max-w-3xl mx-auto leading-tight">
                Estamos procurando parceiros com distribuição médica.
              </h2>
              <p className="text-[#E8EDED]/75 text-base md:text-lg max-w-2xl mx-auto mb-6 leading-relaxed">
                Buscamos investidores, mentores ou grupos médicos que já tenham acesso a uma base de médicos e
                queiram transformar sua mentoria em um ecossistema tecnológico White Label.
              </p>
              <p className="text-xl md:text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#4CCB7A] to-[#2F8FA3] mb-8">
                O mentor ensina o método. O médico aplica. O Oftware escala.
              </p>
              <button
                type="button"
                onClick={leadModal.open}
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all shadow-lg hover:shadow-[#4CCB7A]/30 text-lg"
              >
                Quero conhecer a parceria
                <ArrowRight size={22} />
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-12">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <img src="/logo-site.jpg" alt="Oftware" className="h-10 w-auto mb-4" />
                <p className="text-[#E8EDED]/70 text-sm max-w-md">
                  Infraestrutura digital White Label para acompanhamento médico estruturado. Oftware — Método Emagrecer.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-[#E8EDED] mb-3">Navegação</h4>
                <ul className="space-y-2">
                  <li><a href="/" className="text-[#E8EDED]/70 hover:text-[#4CCB7A] text-sm">Home</a></li>
                  <li><a href="/metodo" className="text-[#E8EDED]/70 hover:text-[#4CCB7A] text-sm">O Método</a></li>
                  <li><a href="/mentoria" className="text-[#E8EDED]/70 hover:text-[#4CCB7A] text-sm">Mentoria</a></li>
                  <li><a href="/apresentacao" className="text-[#E8EDED]/70 hover:text-[#4CCB7A] text-sm">Apresentação</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[#E8EDED] mb-3">Institucional</h4>
                <ul className="space-y-2">
                  <li><a href="/politica-de-privacidade.html" className="text-[#E8EDED]/70 hover:text-[#4CCB7A] text-sm">Política de Privacidade</a></li>
                  <li><a href="/exclusao-de-dados.html" className="text-[#E8EDED]/70 hover:text-[#4CCB7A] text-sm">Política de Exclusão</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-10 space-y-2 max-w-3xl">
              <p className="text-[#E8EDED]/40 text-xs leading-relaxed">
                Conteúdo voltado a investidores, parceiros e profissionais de saúde. A plataforma apoia acompanhamento,
                adesão e organização clínica — não substitui avaliação médica individualizada.
              </p>
              <p className="text-[#E8EDED]/40 text-xs leading-relaxed">
                A resposta ao acompanhamento varia conforme características clínicas, adesão e evolução individual.
              </p>
            </div>
            <div className="mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-[#E8EDED]/50 text-sm">© {new Date().getFullYear()} Oftware. Todos os direitos reservados.</p>
              <div className="flex items-center gap-2 text-[#E8EDED]/50 text-sm">
                <Shield size={16} />
                <span>Plataforma segura e confiável</span>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <MentoriaLeadModal isOpen={leadModal.isOpen} onClose={leadModal.close} />
    </div>
  );
}
