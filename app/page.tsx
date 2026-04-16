'use client';

import React, { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import LandingPageHeader from '@/components/landing/LandingPageHeader';
import InitialLoadingSplash from '@/components/landing/InitialLoadingSplash';
import DepoimentosAnimatedBackdrop from '@/components/landing/DepoimentosAnimatedBackdrop';
import IndicadoresPlataforma from '@/components/landing/IndicadoresPlataforma';
import ChatIA from '@/components/ChatIA';
import {
  Stethoscope,
  UserCheck,
  UtensilsCrossed,
  Dumbbell,
  ArrowRight,
  Shield,
  Zap,
  BarChart3,
  Users,
  MessageCircle,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Star,
  X,
  Loader2,
} from 'lucide-react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from 'recharts';

const DEEP_BLUE = '#0A1F44';
const MEDICO_EMAIL_DEPOIMENTOS = 'ricpmota.med@gmail.com';

type DepoimentoItem = {
  pacienteId: string;
  nome: string;
  cidadeEstado: string | null;
  idade: number | null;
  depoimento: string;
  estrelas: number;
  pesoInicialKg: number | null;
  pesoAtualKg: number | null;
  perdaTotalKg: number | null;
  perdaPercentual: number | null;
  evolucao: { weekIndex: number; peso: number; doseMg: number }[];
};

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [depoimentos, setDepoimentos] = useState<DepoimentoItem[]>([]);
  const [loadingDepoimentos, setLoadingDepoimentos] = useState(true);
  const [depoimentoIndex, setDepoimentoIndex] = useState(0);
  const [depoimentosPausado, setDepoimentosPausado] = useState(false);
  const [depoimentoSelecionado, setDepoimentoSelecionado] = useState<DepoimentoItem | null>(null);
  const [showModalDepoimento, setShowModalDepoimento] = useState(false);
  const [ofertaAtivaIndex, setOfertaAtivaIndex] = useState(0);
  const [pilarAtivoIndex, setPilarAtivoIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      timeoutId = setTimeout(() => setLoading(false), 100);
    });
    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    setLoadingDepoimentos(true);
    fetch(`/api/depoimentos-medico?medicoEmail=${encodeURIComponent(MEDICO_EMAIL_DEPOIMENTOS)}`)
      .then((res) => (res.ok ? res.json() : { depoimentos: [] }))
      .then((data: { depoimentos: DepoimentoItem[] }) => {
        setDepoimentos(data.depoimentos || []);
        setDepoimentoIndex(0);
      })
      .catch(() => setDepoimentos([]))
      .finally(() => setLoadingDepoimentos(false));
  }, []);

  useEffect(() => {
    if (depoimentos.length <= 1 || depoimentosPausado) return;
    const t = setInterval(() => {
      setDepoimentoIndex((i) => (i + 1) % depoimentos.length);
    }, 8000);
    return () => clearInterval(t);
  }, [depoimentos.length, depoimentosPausado]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleGoogleLogin = async (): Promise<boolean> => {
    if (isLoggingIn) return false;
    try {
      setIsLoggingIn(true);
      setLoginError(null);
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      return true;
    } catch (error: unknown) {
      const errorCode = (error as { code?: string }).code;
      if (errorCode === 'auth/popup-closed-by-user') setLoginError('Login cancelado.');
      else if (errorCode === 'auth/popup-blocked') setLoginError('Popup bloqueado. Permita popups.');
      else setLoginError('Erro ao fazer login. Tente novamente.');
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAcessar = async (path: string) => {
    const ref = typeof window !== 'undefined' ? localStorage.getItem('indicacao_ref') : null;
    const metaPath = path === '/meta' && ref ? `/meta?ref=${encodeURIComponent(ref)}` : path;
    if (user) {
      router.push(metaPath);
      return;
    }
    const ok = await handleGoogleLogin();
    if (ok) router.push(metaPath);
  };

  const ofertas = [
    { icon: LayoutDashboard, title: 'Método', shortLabel: 'Método', desc: 'Processo definido e replicável. Cada etapa tem critério e sequência.' },
    { icon: Shield, title: 'Protocolo', shortLabel: 'Protocolo', desc: 'Conduta médica, nutricional e de treino alinhadas em um único plano.' },
    { icon: BarChart3, title: 'Monitoramento', shortLabel: 'Monitoramento', desc: 'Evolução acompanhada em tempo real. Dados, não achismo.' },
    { icon: Zap, title: 'Estrutura Tecnológica', shortLabel: 'Estrutura', desc: 'Médico, nutri e personal no mesmo fluxo — conectados e em sincronia.' },
  ];
  const ofertaAtiva = ofertas[ofertaAtivaIndex];
  const irParaOferta = (next: number) => {
    if (next < 0 || next >= ofertas.length) return;
    setOfertaAtivaIndex(next);
  };

  const pilaresConectados = [
    {
      key: 'paciente',
      slot: 'Pilar 01',
      shortLabel: 'Paciente',
      title: 'Paciente',
      icon: UserCheck,
      objetivo: 'Centralizar rotina, evolução clínica e acompanhamento multiprofissional em um só lugar.',
      detalhes: [
        'Área de nutrição com foto da comida para acompanhamento prático da alimentação.',
        'Cardápio personalizado com base no peso e na evolução, monitorado pela nutricionista.',
        'Treino da academia organizado na plataforma e monitorado pelo personal.',
        'Exames com histórico de evolução para acompanhamento junto ao médico.',
        'Bioimpedância integrada para leitura de composição corporal com a nutricionista.',
      ],
    },
    {
      key: 'medico',
      slot: 'Pilar 02',
      shortLabel: 'Médico',
      title: 'Médico',
      icon: Stethoscope,
      objetivo: 'Conduzir o tratamento e alinhar as decisões com toda a equipe.',
      detalhes: [
        'Define conduta e ajustes clínicos com base em dados, exames e evolução.',
        'Compartilha o tratamento com Nutricionista e Personal.',
      ],
    },
    {
      key: 'nutricionista',
      slot: 'Pilar 03',
      shortLabel: 'Nutricionista',
      title: 'Nutricionista',
      icon: UtensilsCrossed,
      objetivo: 'Integrar alimentação e composição corporal ao tratamento com ajustes coordenados.',
      detalhes: [
        'Recebe a conduta e transforma em estratégia nutricional personalizada.',
        'Acompanha cardápio, fotos alimentares e dados de bioimpedância.',
        'Devolve sinalização contínua para toda a equipe.',
      ],
    },
    {
      key: 'personal',
      slot: 'Pilar 04',
      shortLabel: 'Personal',
      title: 'Personal',
      icon: Dumbbell,
      objetivo: 'Conectar treino ao momento clínico do paciente.',
      detalhes: [
        'Planeja treinos de acordo com fase e resposta do tratamento.',
        'Monitora desempenho e evolução funcional continuamente.',
      ],
    },
  ];

  const totalPilares = pilaresConectados.length;
  const pilarAtivo = pilaresConectados[pilarAtivoIndex];

  const irParaPilar = (next: number) => {
    if (next < 0 || next >= totalPilares) return;
    setPilarAtivoIndex(next);
  };

  if (loading) {
    return <InitialLoadingSplash backgroundColor={DEEP_BLUE} />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: DEEP_BLUE }}>
      <LandingPageHeader user={user} onLogout={handleLogout} onAccessPath={handleAcessar} />

      <main className="relative z-10 pt-[72px] md:pt-[80px]">
        {/* Marca d'água fixa: canto superior direito (abaixo do header), igual à página /mentoria */}
        <div
          className="fixed top-[72px] md:top-[80px] right-0 z-[25] flex items-start justify-end p-3 sm:p-5 pointer-events-none"
          aria-hidden
        >
          <img
            src="/simbolo-metodo.png"
            alt=""
            className="w-[min(200px,35vw)] h-auto opacity-[0.07]"
          />
        </div>

        {/* 1. HERO SECTION */}
        <section className="relative overflow-hidden py-16 md:py-24 lg:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A1F44] via-[#0d2a5a] to-[#0A1F44]" />
          <div className="absolute inset-0 opacity-20">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full animate-float"
                style={{
                  left: `${(i * 8) % 100}%`,
                  top: `${(i * 12) % 100}%`,
                  width: `${40 + i * 8}px`,
                  height: `${40 + i * 8}px`,
                  background: `linear-gradient(135deg, rgba(76, 203, 122, 0.3), rgba(47, 143, 163, 0.2))`,
                  animationDelay: `${i * 0.5}s`,
                }}
              />
            ))}
          </div>
          <div className="relative w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#E8EDED] leading-tight mb-6">
                  Sem método tudo vira tentativa.
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4CCB7A] to-[#2F8FA3]">
                    E tentativa não sustenta resultado.
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-[#E8EDED]/80 mb-8 max-w-xl">
                  Método, processo e acompanhamento integrados. Oftware une protocolo médico, nutrição e treinamento em um sistema que substitui tentativa por resultado.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => handleAcessar('/meta')}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all shadow-lg hover:shadow-[#4CCB7A]/30"
                  >
                    Começar agora
                    <ArrowRight size={20} />
                  </button>
                  <button
                    onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-[#E8EDED] border-2 border-[#E8EDED]/40 hover:border-[#4CCB7A] hover:text-[#4CCB7A] transition-all"
                  >
                    Como funciona
                  </button>
                </div>
              </div>
              <div className="relative lg:block">
                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-2xl">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { icon: Stethoscope, label: 'Médico', color: 'from-[#4CCB7A] to-[#2F8FA3]' },
                      { icon: UserCheck, label: 'Paciente', color: 'from-[#2F8FA3] to-[#4CCB7A]' },
                      { icon: UtensilsCrossed, label: 'Nutricionista', color: 'from-[#4CCB7A] to-[#2F8FA3]' },
                      { icon: Dumbbell, label: 'Personal', color: 'from-[#2F8FA3] to-[#4CCB7A]' },
                    ].map(({ icon: Icon, label, color }) => (
                      <div
                        key={label}
                        className={`p-4 rounded-xl bg-gradient-to-br ${color} bg-opacity-20 border border-white/10`}
                      >
                        <Icon className="w-10 h-10 text-white mb-2" />
                        <p className="text-sm font-semibold text-white">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-white/5 text-[#E8EDED]/80 text-sm">
                    <p className="font-medium text-[#4CCB7A]">Ecossistema integrado</p>
                    <p>Médico, nutri e personal conectados em tempo real</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* INDICADORES / RESULTADOS CONQUISTADOS */}
        <IndicadoresPlataforma />

        {/* SEÇÃO UNIFICADA: Falta de método + Problemas + Manifesto */}
        <section className="w-full py-16 md:py-24 flex flex-col items-center justify-center text-center px-4 sm:px-6">
          <div className="w-full max-w-[1200px] mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="order-2 lg:order-1 flex flex-col items-center lg:items-start text-center lg:text-left">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#E8EDED] max-w-xl leading-tight">
                  Não é falta de esforço.
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4CCB7A] to-[#2F8FA3]">
                    É falta de método.
                  </span>
                </h1>
                <p className="mt-6 text-lg md:text-xl text-[#E8EDED]/70 max-w-xl">
                  A Oftware conecta médico, nutrição e treino em um único fluxo contínuo,
                  transformando tentativa em estratégia e resultado.
                </p>
                <div className="mt-10 bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 max-w-xl w-full text-left">
                  <ul className="space-y-4 text-[#E8EDED]/80">
                    <li className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-[#4CCB7A] flex-shrink-0"></span>
                      Depender de motivação todos os dias
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-[#4CCB7A] flex-shrink-0"></span>
                      Falta de acompanhamento real
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-[#4CCB7A] flex-shrink-0"></span>
                      Decisões baseadas em tentativa
                    </li>
                  </ul>
                </div>
                <h2 className="mt-10 text-xl md:text-2xl font-semibold text-[#E8EDED] max-w-xl">
                  Saúde não é sorte. Não é impulso.
                  <br />
                  <span className="text-[#4CCB7A]">É método.</span>
                </h2>
                <button
                  onClick={() => handleAcessar('/meta')}
                  className="mt-8 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all shadow-lg hover:shadow-[#4CCB7A]/30"
                >
                  Começar agora
                  <ArrowRight size={20} />
                </button>
              </div>
              <div className="order-1 lg:order-2 flex justify-center">
                <img
                  src="/criativo-metodo.png"
                  alt="Método Emagrecer"
                  className="w-full max-w-sm md:max-w-md rounded-2xl shadow-2xl object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 4. O QUE OFERECEMOS — clareza imediata: "o que é isso?" */}
        <section className="py-16 md:py-24">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-[#E8EDED] text-center mb-4">O que oferecemos</h2>
            <p className="text-[#E8EDED]/70 text-center max-w-2xl mx-auto mb-12">
              Tudo integrado. Sem tentativa.
            </p>

            <div className="sm:hidden">
              <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/80 overflow-hidden shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)]">
                <div className="grid grid-cols-4 border-b border-white/10 bg-white/5">
                  {ofertas.map(({ icon: Icon, title, shortLabel }, index) => {
                    const active = index === ofertaAtivaIndex;
                    return (
                      <button
                        key={title}
                        type="button"
                        onClick={() => irParaOferta(index)}
                        className={`flex flex-col items-center justify-center gap-1 py-2 border-r border-white/10 last:border-r-0 transition-all ${
                          active ? 'bg-[#4CCB7A]/12 text-[#4CCB7A]' : 'text-[#E8EDED]/65'
                        }`}
                        aria-current={active ? 'true' : undefined}
                        aria-label={title}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px] font-semibold leading-tight text-center px-1">{shortLabel}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="p-5 transition-all">
                  <div className="mb-3 flex items-center justify-between text-xs text-[#E8EDED]/65">
                    <span>
                      Item <span className="font-semibold text-[#4CCB7A]">{ofertaAtivaIndex + 1}</span> / {ofertas.length}
                    </span>
                    <span className="text-[#E8EDED]/50">{ofertaAtiva.title}</span>
                  </div>
                  <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#2F8FA3] to-[#4CCB7A] transition-all duration-300"
                      style={{ width: `${((ofertaAtivaIndex + 1) / ofertas.length) * 100}%` }}
                    />
                  </div>

                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center mb-4">
                    <ofertaAtiva.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-[#E8EDED] mb-2">{ofertaAtiva.title}</h3>
                  <p className="text-[#E8EDED]/75 text-sm leading-relaxed">{ofertaAtiva.desc}</p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => irParaOferta(ofertaAtivaIndex - 1)}
                      disabled={ofertaAtivaIndex === 0}
                      className="min-h-[42px] rounded-xl border border-white/15 text-sm font-semibold text-[#E8EDED] disabled:opacity-40"
                    >
                      <span className="inline-flex items-center gap-1">
                        <ChevronLeft className="w-4 h-4" />
                        Anterior
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => irParaOferta(ofertaAtivaIndex + 1)}
                      disabled={ofertaAtivaIndex >= ofertas.length - 1}
                      className="min-h-[42px] rounded-xl border border-[#4CCB7A]/40 bg-[#4CCB7A]/10 text-sm font-semibold text-[#4CCB7A] disabled:opacity-40"
                    >
                      <span className="inline-flex items-center gap-1">
                        Próximo
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {ofertas.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#4CCB7A]/40 transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-[#E8EDED] mb-2">{title}</h3>
                  <p className="text-[#E8EDED]/70 text-sm">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. FUNCIONAMENTO NA PRÁTICA — prova técnica: "como funciona?" */}
        <section className="py-16 md:py-24 bg-white/5 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#4CCB7A]/5 blur-[100px]" />
          </div>
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#E8EDED] mb-4">
                Como o método funciona na prática
              </h2>
              <p className="text-[#E8EDED]/70 max-w-2xl mx-auto text-lg">
                Quatro pilares conectados em um fluxo único de acompanhamento.
              </p>
            </div>

            <div className="mx-auto w-full max-w-5xl">
              <div className="mb-8 hidden overflow-hidden rounded-2xl border border-white/10 bg-[#0A1F44]/80 shadow-[0_12px_40px_-12px_rgba(76,203,122,0.22)] sm:block">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 md:px-6">
                  <button
                    type="button"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-[#E8EDED]/40"
                    disabled
                    aria-hidden
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="text-center">
                    <p className="text-sm md:text-base font-bold text-[#E8EDED]">Pilares conectados</p>
                  </div>
                  <button
                    type="button"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-[#E8EDED]/40"
                    disabled
                    aria-hidden
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-4 border-b border-white/10 text-center text-[0.62rem] sm:text-xs font-semibold uppercase tracking-wide text-[#E8EDED]/60 bg-white/5">
                  {pilaresConectados.map((pilar) => (
                    <div key={pilar.key} className="border-r border-white/10 py-2 last:border-r-0">
                      {pilar.shortLabel}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-b border-white/10 p-2 sm:p-3">
                  {pilaresConectados.map((pilar, index) => {
                    const ativo = index === pilarAtivoIndex;
                    const num = String(index + 1).padStart(2, '0');
                    return (
                      <button
                        key={pilar.key}
                        type="button"
                        onClick={() => irParaPilar(index)}
                        className={`flex min-h-[82px] flex-col items-center justify-center border-r border-white/10 p-2 text-center transition-all last:border-r-0 ${
                          ativo ? 'bg-[#4CCB7A]/12 ring-1 ring-inset ring-[#4CCB7A]/40' : 'hover:bg-white/[0.03]'
                        }`}
                        aria-current={ativo ? 'step' : undefined}
                        aria-label={`${pilar.slot} — ${pilar.title}`}
                      >
                        <span className="text-[0.62rem] font-medium uppercase text-[#E8EDED]/70">{pilar.slot}</span>
                        <span className={`mt-1 text-xl sm:text-2xl font-bold tabular-nums ${ativo ? 'text-[#4CCB7A]' : 'text-[#E8EDED]'}`}>{num}</span>
                        <span className="mt-1 text-[0.68rem] sm:text-xs font-medium text-[#E8EDED]/80">{pilar.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-4 hidden sm:flex sm:flex-row sm:items-center sm:justify-between text-sm text-[#E8EDED]/70">
                <span>
                  Pilar <span className="font-semibold text-[#4CCB7A]">{pilarAtivoIndex + 1}</span> / {totalPilares}
                </span>
                <span className="text-[#E8EDED]/55">{pilarAtivo.slot}</span>
              </div>

              <div className="mb-6 hidden sm:block h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2F8FA3] to-[#4CCB7A] transition-all duration-300"
                  style={{ width: `${((pilarAtivoIndex + 1) / totalPilares) * 100}%` }}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
                <button
                  type="button"
                  aria-label="Pilar anterior"
                  disabled={pilarAtivoIndex === 0}
                  onClick={() => irParaPilar(pilarAtivoIndex - 1)}
                  className="hidden sm:flex min-h-[44px] w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-[#0A1F44] text-[#4CCB7A] disabled:opacity-40"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <div className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0A1F44]/80 p-5 sm:p-8 shadow-md">
                  <div className="mb-4 sm:hidden overflow-hidden rounded-xl border border-white/10">
                    <div className="border-b border-white/10 px-3 py-2 text-center">
                      <p className="text-xs font-semibold text-[#E8EDED]">Pilares conectados</p>
                    </div>
                    <div className="grid grid-cols-4 text-center text-[0.62rem] font-semibold uppercase tracking-wide bg-white/5">
                      {pilaresConectados.map((pilar, index) => {
                        const ativo = index === pilarAtivoIndex;
                        return (
                          <div
                            key={pilar.key}
                            className={`border-r border-white/10 py-2 last:border-r-0 transition-colors ${
                              ativo ? 'text-[#4CCB7A] bg-[#4CCB7A]/10' : 'text-[#E8EDED]/60'
                            }`}
                          >
                            {pilar.shortLabel}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mb-4 sm:hidden">
                    <div className="mb-2 flex items-center justify-between text-xs text-[#E8EDED]/70">
                      <span>
                        Pilar <span className="font-semibold text-[#4CCB7A]">{pilarAtivoIndex + 1}</span> / {totalPilares}
                      </span>
                      <span className="text-[#E8EDED]/55">{pilarAtivo.slot}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#2F8FA3] to-[#4CCB7A] transition-all duration-300"
                        style={{ width: `${((pilarAtivoIndex + 1) / totalPilares) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#4CCB7A]/40 bg-[#4CCB7A]/10 text-[#4CCB7A]">
                      <pilarAtivo.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#4CCB7A]">{pilarAtivo.slot}</p>
                      <p className="text-lg sm:text-xl font-bold text-[#E8EDED]">{pilarAtivo.title}</p>
                    </div>
                  </div>
                  <p className="mb-2 text-sm font-semibold text-[#4CCB7A]">Objetivo</p>
                  <p className="mb-5 text-sm sm:text-base leading-relaxed text-[#E8EDED]/80">{pilarAtivo.objetivo}</p>
                  <p className="mb-2 text-sm font-semibold text-[#4CCB7A]">Em foco</p>
                  <ul className="space-y-2">
                    {pilarAtivo.detalhes.map((linha) => (
                      <li key={linha} className="flex gap-3 text-sm sm:text-base text-[#E8EDED]/80">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#4CCB7A]" />
                        <span>{linha}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  aria-label="Próximo pilar"
                  disabled={pilarAtivoIndex >= totalPilares - 1}
                  onClick={() => irParaPilar(pilarAtivoIndex + 1)}
                  className="hidden sm:flex min-h-[44px] w-12 shrink-0 items-center justify-center rounded-xl border border-[#4CCB7A]/40 bg-[#4CCB7A]/10 text-[#4CCB7A] disabled:opacity-40"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:hidden">
                <button
                  type="button"
                  disabled={pilarAtivoIndex === 0}
                  onClick={() => irParaPilar(pilarAtivoIndex - 1)}
                  className="min-h-[48px] rounded-xl border border-white/15 px-3 text-sm font-semibold text-[#E8EDED] disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={pilarAtivoIndex >= totalPilares - 1}
                  onClick={() => irParaPilar(pilarAtivoIndex + 1)}
                  className="min-h-[48px] rounded-xl border border-[#4CCB7A]/40 bg-[#4CCB7A]/10 px-3 text-sm font-semibold text-[#4CCB7A] disabled:opacity-40"
                >
                  Próximo
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 6. DIFERENCIAL — posicionamento: "por que é diferente?" */}
        <section className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-2xl md:text-3xl font-bold text-[#E8EDED] leading-tight mb-4">
              Não entregamos tentativa.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4CCB7A] to-[#2F8FA3]">
                Entregamos um método estruturado.
              </span>
            </p>
            <p className="text-[#E8EDED]/70 text-lg">
              Tudo em um fluxo contínuo. Médico, nutrição e treino na mesma jornada.
            </p>
          </div>
        </section>

        {/* DEPOIMENTOS — prova social: "outros conseguem?" */}
        <section className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-2xl shadow-xl p-8 overflow-hidden border border-white/10">
              <DepoimentosAnimatedBackdrop />

              <div className="relative">
                <h2 className="text-xl font-bold text-[#0A1F44] mb-6">Depoimentos</h2>
                {loadingDepoimentos ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-10 w-10 text-[#4CCB7A] animate-spin" />
                    <span className="ml-3 text-[#0A1F44]/80 font-medium">Carregando depoimentos...</span>
                  </div>
                ) : depoimentos.length === 0 ? (
                  <p className="text-[#0A1F44]/70 text-center py-8 font-medium">Nenhum depoimento publicado ainda.</p>
                ) : (
                  <div className="relative cursor-pointer" onClick={() => setDepoimentosPausado(true)}>
                    <div key={depoimentoIndex} className="min-h-[160px] flex flex-col items-center justify-center text-center px-4 animate-fade-in">
                      <div className="flex items-center justify-center gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={20}
                            className={s <= (depoimentos[depoimentoIndex]?.estrelas ?? 0) ? 'text-amber-500 fill-amber-500' : 'text-[#0A1F44]/25'}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-center gap-3 mb-0.5">
                        <p className="text-[#0A1F44] font-semibold">{depoimentos[depoimentoIndex]?.nome}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDepoimentosPausado(true);
                            setDepoimentoSelecionado(depoimentos[depoimentoIndex]);
                            setShowModalDepoimento(true);
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-pink-500 hover:bg-pink-600 text-white shadow-md"
                          aria-label="Ver resultado do tratamento"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                      </div>
                      {(depoimentos[depoimentoIndex]?.cidadeEstado || depoimentos[depoimentoIndex]?.idade != null) && (
                        <p className="text-[#0A1F44]/70 text-sm mb-2">
                          {[depoimentos[depoimentoIndex]?.cidadeEstado, depoimentos[depoimentoIndex]?.idade != null ? `${depoimentos[depoimentoIndex]?.idade} anos` : null].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <p className="text-[#0A1F44]/90 leading-relaxed max-w-2xl font-medium">&quot;{depoimentos[depoimentoIndex]?.depoimento}&quot;</p>
                    </div>

                    {depoimentos.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDepoimentoIndex((i) => (i - 1 + depoimentos.length) % depoimentos.length); }}
                          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 p-2 rounded-full bg-[#0A1F44]/10 hover:bg-[#0A1F44]/20 text-[#0A1F44]/80"
                          aria-label="Anterior"
                        >
                          <ChevronDown className="h-5 w-5 rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDepoimentoIndex((i) => (i + 1) % depoimentos.length); }}
                          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 p-2 rounded-full bg-[#0A1F44]/10 hover:bg-[#0A1F44]/20 text-[#0A1F44]/80"
                          aria-label="Próximo"
                        >
                          <ChevronDown className="h-5 w-5 -rotate-90" />
                        </button>
                        <div className="flex justify-center gap-1.5 mt-4">
                          {depoimentos.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setDepoimentoIndex(i); }}
                              className={`w-2 h-2 rounded-full transition-colors ${i === depoimentoIndex ? 'bg-[#4CCB7A]' : 'bg-[#0A1F44]/30 hover:bg-[#0A1F44]/50'}`}
                              aria-label={`Depoimento ${i + 1}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-center pb-12">
          <button
            onClick={() => handleAcessar('/meta')}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all shadow-lg hover:shadow-[#4CCB7A]/30"
          >
            Começar agora
            <ArrowRight size={20} />
          </button>
        </div>

        {/* 7. COMO FUNCIONA — jornada: "como entra na minha vida?" */}
        <section id="como-funciona" className="py-16 md:py-24">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-[#E8EDED] text-center mb-4">O que acontece quando você entra no Método</h2>
            <p className="text-[#E8EDED]/70 text-center max-w-2xl mx-auto mb-12">
              Sua jornada, passo a passo.
            </p>
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: 1, title: 'Entrada', desc: 'Você entra por indicação do médico ou escolhe um profissional qualificado para começar.' },
                { step: 2, title: 'Plano', desc: 'Recebe um protocolo personalizado — médico, nutrição e treino alinhados desde o início.' },
                { step: 3, title: 'Acompanhamento', desc: 'Monitoramento contínuo. Não espera só o retorno: evolução acompanhada em tempo real.' },
                { step: 4, title: 'Resultado', desc: 'Seu corpo responde, o plano evolui e o resultado aparece.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center text-[#0A1F44] font-bold text-xl mb-4">{step}</div>
                    <h3 className="text-lg font-bold text-[#E8EDED] mb-2">{title}</h3>
                    <p className="text-[#E8EDED]/70 text-sm">{desc}</p>
                  </div>
                  {step < 4 && <div className="hidden md:block absolute top-7 left-[calc(50%+3rem)] w-[calc(100%-3rem)] h-0.5 bg-gradient-to-r from-[#4CCB7A]/50 to-transparent" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Modal Resultado do Depoimento */}
        {showModalDepoimento && depoimentoSelecionado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative animate-modal-enter">
              <button
                type="button"
                onClick={() => setShowModalDepoimento(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-gray-900 mb-2">Resultado do tratamento</h3>
              <p className="text-sm text-gray-600 mb-4">
                {depoimentoSelecionado.nome}
                {(depoimentoSelecionado.cidadeEstado || depoimentoSelecionado.idade != null) && (
                  <>
                    {' · '}
                    {[depoimentoSelecionado.cidadeEstado, depoimentoSelecionado.idade != null ? `${depoimentoSelecionado.idade} anos` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </>
                )}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-700 font-medium">Peso inicial</p>
                  <p className="text-lg font-semibold text-green-900">
                    {depoimentoSelecionado.pesoInicialKg != null ? `${depoimentoSelecionado.pesoInicialKg.toFixed(1)} kg` : '—'}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-700 font-medium">Peso atual</p>
                  <p className="text-lg font-semibold text-green-900">
                    {depoimentoSelecionado.pesoAtualKg != null ? `${depoimentoSelecionado.pesoAtualKg.toFixed(1)} kg` : '—'}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-700 font-medium">Perda total (kg)</p>
                  <p className="text-lg font-semibold text-green-900">
                    {depoimentoSelecionado.perdaTotalKg != null ? `-${depoimentoSelecionado.perdaTotalKg.toFixed(1)} kg` : '—'}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-700 font-medium">Perda percentual</p>
                  <p className="text-lg font-semibold text-green-900">
                    {depoimentoSelecionado.perdaPercentual != null ? `-${depoimentoSelecionado.perdaPercentual.toFixed(1)}%` : '—'}
                  </p>
                </div>
              </div>

              {depoimentoSelecionado.evolucao.length > 0 && (() => {
                const maxDose = depoimentoSelecionado.evolucao.reduce((m, p) => Math.max(m, p.doseMg || 0), 0);
                const maxDoseAxis = maxDose > 0 ? Math.min(30, maxDose * 2) : 15;
                const baseTicks = [2.5, 5, 7.5, 10, 12.5, 15];
                const doseTicks = baseTicks.filter((v) => v <= maxDoseAxis);
                const chartData = depoimentoSelecionado.evolucao.map((p) => ({
                  semana: `S${p.weekIndex}`,
                  peso: p.peso ?? null,
                  dose: p.doseMg ?? 0,
                }));
                const totalDose = depoimentoSelecionado.evolucao.reduce((s, p) => s + (p.doseMg || 0), 0);
                const patternId = `dosePat_${String(depoimentoSelecionado.pacienteId || 'x').replace(/[^a-zA-Z0-9_-]/g, '_')}`;

                return (
                  <div className="flex flex-col">
                    <div className="h-56 w-full min-h-[14rem]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                          <defs>
                            <pattern id={patternId} patternUnits="userSpaceOnUse" width={10} height={10}>
                              <rect width="10" height="10" fill="#fdf2f8" />
                              <path d="M0 10 L10 0 M-2 2 L2 -2 M8 12 L12 8" stroke="#db2777" strokeWidth={1.2} strokeOpacity={0.85} />
                            </pattern>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="semana" tick={{ fontSize: 11 }} stroke="#6b7280" />
                          <YAxis yAxisId="peso" tick={{ fontSize: 11 }} stroke="#6b7280" unit=" kg" />
                          <YAxis yAxisId="dose" orientation="right" tick={{ fontSize: 11 }} stroke="#ec4899" unit=" mg" domain={[0, maxDoseAxis]} ticks={doseTicks} />
                          <Tooltip
                            formatter={(val: number, key: string) => {
                              if (key === 'peso') return [`${val?.toFixed(1) ?? '—'} kg`, 'Peso'];
                              if (key === 'dose') return [`${val?.toFixed(1) ?? '0'} mg`, 'Dose aplicada'];
                              return [val, key];
                            }}
                            labelFormatter={(l) => `Semana ${l}`}
                          />
                          <Bar yAxisId="dose" dataKey="dose" name="Dose aplicada" fill={`url(#${patternId})`} stroke="#be185d" strokeWidth={1} barSize={Math.min(28, Math.max(10, 320 / chartData.length))} radius={[4, 4, 0, 0]} />
                          <Line yAxisId="peso" type="monotone" dataKey="peso" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    {totalDose > 0 && (
                      <div className="flex justify-center pt-3 pb-1">
                        <div className="px-3 py-1.5 rounded-full bg-pink-600 text-xs font-semibold text-white shadow">
                          {totalDose.toFixed(1)} mg (total)
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* CTA FINAL — fechamento de conversão */}
        <section className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-[#E8EDED] mb-4">
              Pronto para sair da tentativa?
            </h2>
            <p className="text-[#E8EDED]/80 mb-8 max-w-2xl mx-auto">
              Entre no fluxo que substitui tentativa por resultado.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => handleAcessar('/meta')}
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all shadow-lg hover:shadow-[#4CCB7A]/30"
              >
                Começar agora
                <ArrowRight size={20} />
              </button>
              <button
                onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl font-semibold text-[#E8EDED] border-2 border-[#E8EDED]/40 hover:border-[#4CCB7A] hover:text-[#4CCB7A] transition-all"
              >
                Como funciona
              </button>
            </div>
          </div>
        </section>

        {/* 11. FOOTER */}
        <footer className="border-t border-white/10 py-12">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <img src="/logo-site.jpg" alt="Oftware" className="h-10 w-auto mb-4" />
                <p className="text-[#E8EDED]/70 text-sm max-w-md">
                  Método estruturado. Não tentativa. Oftware — Método Emagrecer.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-[#E8EDED] mb-3">Acesso</h4>
                <ul className="space-y-2">
                  <li><a href="/" className="text-[#E8EDED]/70 hover:text-[#4CCB7A] text-sm">Home</a></li>
                  <li><a href="/meta" className="text-[#E8EDED]/70 hover:text-[#4CCB7A] text-sm">Área do Paciente</a></li>
                  <li><a href="/metaadmin" className="text-[#E8EDED]/70 hover:text-[#4CCB7A] text-sm">Área do Médico</a></li>
                  <li><a href="/metanutri" className="text-[#E8EDED]/70 hover:text-[#4CCB7A] text-sm">Área do Nutricionista</a></li>
                  <li><a href="/metapersonal" className="text-[#E8EDED]/70 hover:text-[#4CCB7A] text-sm">Área do Personal</a></li>
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
            <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-[#E8EDED]/50 text-sm">© {new Date().getFullYear()} Oftware. Todos os direitos reservados.</p>
              <div className="flex items-center gap-2 text-[#E8EDED]/50 text-sm">
                <Shield size={16} />
                <span>Plataforma segura e confiável</span>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <ChatIA
        userLabel={user?.displayName?.split(/\s+/)[0] ?? 'visitante'}
        floatPosition="right"
        contextSurface="public"
      />

      {loginError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-3 rounded-lg text-sm shadow-lg z-50 max-w-md flex items-center gap-2">
          {loginError}
          <button onClick={() => setLoginError(null)} className="p-1 hover:bg-white/20 rounded">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
