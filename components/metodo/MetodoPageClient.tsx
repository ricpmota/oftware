'use client';

import React, { useState, useEffect, useRef } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import LandingPageHeader from '@/components/landing/LandingPageHeader';
import InitialLoadingSplash from '@/components/landing/InitialLoadingSplash';
import DepoimentosAnimatedBackdrop from '@/components/landing/DepoimentosAnimatedBackdrop';
import IndicadoresPlataforma from '@/components/landing/IndicadoresPlataforma';
import ChatIA from '@/components/ChatIA';
import OmetodoInstagramEmbed from '@/components/mentoria/OmetodoInstagramEmbed';
import { ometodoInstagramPermalink } from '@/lib/ometodoInstagram';
import { useLandingPageVersionBust } from '@/hooks/useLandingPageVersionBust';
import { withIndicacaoRef } from '@/lib/landing/appNavigation';
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
  CheckCircle,
  X,
  Loader2,
} from 'lucide-react';
const DEEP_BLUE = '#0A1F44';
const MEDICO_EMAIL_DEPOIMENTOS = 'ricpmota.med@gmail.com';

type DepoimentoItem = {
  instanceKey?: string;
  pacienteId: string;
  nome: string;
  cidadeEstado: string | null;
  idade: number | null;
  depoimento: string;
};

type MedicoHomeItem = {
  id: string;
  nome: string;
  genero: 'M' | 'F';
  fotoPerfilUrl: string;
  slug: string;
  totalAvaliacoes: number;
  mediaAvaliacoes: number;
};

export default function MetodoPageClient() {
  const instagramMetodoPermalink = ometodoInstagramPermalink();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [depoimentos, setDepoimentos] = useState<DepoimentoItem[]>([]);
  const [loadingDepoimentos, setLoadingDepoimentos] = useState(true);
  const [depoimentoIndex, setDepoimentoIndex] = useState(0);
  const [depoimentosPausado, setDepoimentosPausado] = useState(false);
  const [showModalDepoimentosMedico, setShowModalDepoimentosMedico] = useState(false);
  const [depoimentosMedicoSelecionado, setDepoimentosMedicoSelecionado] = useState<DepoimentoItem[]>([]);
  const [medicoSelecionadoParaDepoimentos, setMedicoSelecionadoParaDepoimentos] = useState<MedicoHomeItem | null>(null);
  const [loadingDepoimentosMedico, setLoadingDepoimentosMedico] = useState(false);
  const [cacheDepoimentosMedico, setCacheDepoimentosMedico] = useState<Record<string, DepoimentoItem[]>>({});
  const [medicosHome, setMedicosHome] = useState<MedicoHomeItem[]>([]);
  const [loadingMedicosHome, setLoadingMedicosHome] = useState(true);
  const medicosMobileTrackRef = useRef<HTMLDivElement | null>(null);
  const [canScrollMedicosLeft, setCanScrollMedicosLeft] = useState(false);
  const [canScrollMedicosRight, setCanScrollMedicosRight] = useState(false);
  const [ofertaAtivaIndex, setOfertaAtivaIndex] = useState(0);
  const [pilarAtivoIndex, setPilarAtivoIndex] = useState(0);
  const router = useRouter();
  useLandingPageVersionBust('/metodo');

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

  useEffect(() => {
    setLoadingMedicosHome(true);
    fetch('/api/medicos-home')
      .then((res) => (res.ok ? res.json() : { medicos: [] }))
      .then((data: { medicos: MedicoHomeItem[] }) => setMedicosHome(data.medicos || []))
      .catch(() => setMedicosHome([]))
      .finally(() => setLoadingMedicosHome(false));
  }, []);

  useEffect(() => {
    const el = medicosMobileTrackRef.current;
    if (!el) return;

    const updateArrows = () => {
      const maxLeft = el.scrollWidth - el.clientWidth;
      setCanScrollMedicosLeft(el.scrollLeft > 8);
      setCanScrollMedicosRight(maxLeft - el.scrollLeft > 8);
    };

    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [medicosHome]);

  const scrollMedicosMobile = (direction: 'left' | 'right') => {
    const el = medicosMobileTrackRef.current;
    if (!el) return;
    const amount = Math.max(180, Math.round(el.clientWidth * 0.82));
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const abrirDepoimentosMedico = async (medico: MedicoHomeItem) => {
    setMedicoSelecionadoParaDepoimentos(medico);
    setShowModalDepoimentosMedico(true);

    if (cacheDepoimentosMedico[medico.id]) {
      setDepoimentosMedicoSelecionado(cacheDepoimentosMedico[medico.id]);
      setLoadingDepoimentosMedico(false);
      return;
    }

    setLoadingDepoimentosMedico(true);
    try {
      const resp = await fetch(`/api/depoimentos-medico?medicoId=${encodeURIComponent(medico.id)}&limit=30`);
      const data = resp.ok ? await resp.json() : { depoimentos: [] };
      const lista = (data?.depoimentos || []) as DepoimentoItem[];
      setDepoimentosMedicoSelecionado(lista);
      setCacheDepoimentosMedico((prev) => ({ ...prev, [medico.id]: lista }));
    } catch {
      setDepoimentosMedicoSelecionado([]);
    } finally {
      setLoadingDepoimentosMedico(false);
    }
  };

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

  const handleAcessar = (path: string) => {
    const target = path === '/meta' ? withIndicacaoRef(path) : path;
    if (user) {
      router.push(target);
      return;
    }
    void (async () => {
      const ok = await handleGoogleLogin();
      if (ok) router.push(target);
    })();
  };

  const ofertas = [
    { icon: LayoutDashboard, title: 'Método', shortLabel: 'Método', desc: 'Processo definido e replicável. Cada etapa tem critério e sequência.' },
    { icon: Shield, title: 'Protocolo', shortLabel: 'Protocolo', desc: 'Conduta médica, nutricional e de treino alinhadas em um único plano.' },
    { icon: BarChart3, title: 'Monitoramento', shortLabel: 'Monitoramento', desc: 'Acompanhamento contínuo com dados organizados para apoio à decisão clínica.' },
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
        'Recebe a conduta e organiza a estratégia nutricional personalizada.',
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
        'Monitora evolução funcional e adesão ao plano continuamente.',
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
    <div className="min-h-screen metaadmin-home-dark-scroll" style={{ backgroundColor: DEEP_BLUE }}>
      <LandingPageHeader
        user={user}
        onLogout={handleLogout}
        onAccessPath={handleAcessar}
        logoSrc="/og-metodo-simbolo.jpg"
        logoAlt="Método Emagrecer"
        logoHref="/metodo"
      />

      <main className="relative z-10 pt-[72px] md:pt-[80px]">
        {/* Marca d'água fixa: canto superior direito (abaixo do header), igual à página /mentoria */}
        <div
          className="fixed top-[72px] md:top-[80px] right-0 z-[25] flex items-start justify-end p-3 sm:p-5 pointer-events-none"
          aria-hidden
        >
          <img
            src="/og-metodo-simbolo.jpg"
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
                    E tentativa não sustenta continuidade.
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-[#E8EDED]/80 mb-8 max-w-xl">
                  Acompanhamento médico estruturado com equipe multidisciplinar integrada.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => handleAcessar('/meta')}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all shadow-lg hover:shadow-[#4CCB7A]/30"
                  >
                    Iniciar acompanhamento
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
                    <p>Médico, nutri e personal conectados com monitoramento contínuo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* INDICADORES DE ACOMPANHAMENTO */}
        <IndicadoresPlataforma hideWeightLossMetrics />

        {/* PROVA DE AUTORIDADE CLÍNICA */}
        <section className="py-16 md:py-24">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[#E8EDED] mb-3">Comece com acompanhamento médico estruturado</h2>
              <p className="text-[#E8EDED]/70 max-w-2xl mx-auto">
                Escolha um médico verificado da Oftware para iniciar seu acompanhamento com método e monitoramento contínuo.
              </p>
            </div>

            {loadingMedicosHome ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 text-[#4CCB7A] animate-spin" />
                <span className="ml-3 text-[#E8EDED]/80">Carregando médicos...</span>
              </div>
            ) : medicosHome.length === 0 ? (
              <p className="text-center text-[#E8EDED]/70">Nenhum médico disponível no momento.</p>
            ) : (
              <>
                <div className="sm:hidden">
                  <div
                    ref={medicosMobileTrackRef}
                    className="relative -mx-4 px-4 overflow-x-auto scrollbar-hide"
                    style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
                  >
                    <div className="flex gap-4 w-max pb-2 snap-x snap-mandatory">
                    {medicosHome.map((medico) => (
                      <div key={medico.id} className="snap-start w-[172px] shrink-0 text-center">
                        <a href={`/dr/${medico.slug}`} className="group block">
                          <div className="relative mx-auto w-32 h-32">
                            <img
                              src={medico.fotoPerfilUrl}
                              alt={`${medico.genero === 'F' ? 'Dra.' : 'Dr.'} ${medico.nome}`}
                              className="h-32 w-32 rounded-full object-cover border-2 border-white/30 group-hover:border-[#4CCB7A]/80 transition-colors shadow-xl"
                            />
                          </div>
                          <p className="mt-3 text-[#E8EDED] font-semibold text-sm leading-tight">
                            {medico.genero === 'F' ? 'Dra.' : 'Dr.'} {medico.nome}
                          </p>
                          <p className="mt-1 inline-flex items-center justify-center gap-1 text-xs text-[#4CCB7A]/90">
                            <CheckCircle size={13} className="shrink-0" />
                            Perfil verificado
                          </p>
                        </a>
                        <button
                          type="button"
                          onClick={() => abrirDepoimentosMedico(medico)}
                          className="mt-2 inline-flex items-center rounded-full border border-[#4CCB7A]/45 bg-[#4CCB7A]/10 px-3 py-1 text-[11px] font-semibold text-[#4CCB7A] hover:bg-[#4CCB7A]/20 transition-colors"
                        >
                          Experiências
                        </button>
                        <p className="mt-1.5 text-[10px] text-[#E8EDED]/45 leading-snug px-1">
                          Relatos individuais compartilhados espontaneamente pelos pacientes.
                        </p>
                      </div>
                    ))}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => scrollMedicosMobile('left')}
                      disabled={!canScrollMedicosLeft}
                      className="h-8 w-8 rounded-full border border-white/20 text-[#E8EDED]/80 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Ver médicos anteriores"
                    >
                      <ChevronLeft className="h-4 w-4 mx-auto" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollMedicosMobile('right')}
                      disabled={!canScrollMedicosRight}
                      className="h-8 w-8 rounded-full border border-white/20 text-[#E8EDED]/80 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Ver próximos médicos"
                    >
                      <ChevronRight className="h-4 w-4 mx-auto" />
                    </button>
                  </div>
                </div>

                <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8 justify-items-center max-w-[980px] mx-auto">
                  {medicosHome.map((medico) => (
                    <div key={medico.id} className="text-center">
                      <a href={`/dr/${medico.slug}`} className="group block">
                        <div className="relative mx-auto w-40 h-40">
                          <img
                            src={medico.fotoPerfilUrl}
                            alt={`${medico.genero === 'F' ? 'Dra.' : 'Dr.'} ${medico.nome}`}
                            className="h-40 w-40 rounded-full object-cover border-2 border-white/30 group-hover:border-[#4CCB7A]/80 transition-colors shadow-xl"
                          />
                        </div>
                        <p className="mt-3 text-[#E8EDED] font-semibold leading-tight">
                          {medico.genero === 'F' ? 'Dra.' : 'Dr.'} {medico.nome}
                        </p>
                        <p className="mt-1 inline-flex items-center justify-center gap-1 text-xs text-[#4CCB7A]/90">
                          <CheckCircle size={14} className="shrink-0" />
                          Perfil verificado
                        </p>
                      </a>
                      <button
                        type="button"
                        onClick={() => abrirDepoimentosMedico(medico)}
                        className="mt-2 inline-flex items-center rounded-full border border-[#4CCB7A]/45 bg-[#4CCB7A]/10 px-3 py-1 text-[11px] font-semibold text-[#4CCB7A] hover:bg-[#4CCB7A]/20 transition-colors"
                      >
                        Experiências
                      </button>
                      <p className="mt-1.5 text-[11px] text-[#E8EDED]/45 leading-snug max-w-[200px] mx-auto">
                        Relatos individuais compartilhados espontaneamente pelos pacientes.
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

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
                  organizando rotina, monitoramento e integração clínica em um fluxo contínuo.
                </p>
                <div className="mt-10 bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 max-w-xl w-full text-left">
                  <ul className="space-y-4 text-[#E8EDED]/80">
                    <li className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-[#4CCB7A] flex-shrink-0"></span>
                      Depender de motivação todos os dias
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-[#4CCB7A] flex-shrink-0"></span>
                      Falta de acompanhamento estruturado
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-[#4CCB7A] flex-shrink-0"></span>
                      Decisões baseadas em tentativa
                    </li>
                  </ul>
                </div>
                <h2 className="mt-10 text-xl md:text-2xl font-semibold text-[#E8EDED] max-w-xl">
                  Saúde exige acompanhamento, rotina e{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4CCB7A] to-[#2F8FA3]">
                    continuidade
                  </span>
                  .
                </h2>
                <button
                  onClick={() => handleAcessar('/meta')}
                  className="mt-8 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all shadow-lg hover:shadow-[#4CCB7A]/30"
                >
                  Iniciar acompanhamento
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
              Tudo integrado em um fluxo contínuo.
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
                Como o acompanhamento se organiza na prática
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
              Não é improviso.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4CCB7A] to-[#2F8FA3]">
                É acompanhamento com método estruturado.
              </span>
            </p>
            <p className="text-[#E8EDED]/70 text-lg">
              Tudo em um fluxo contínuo. Médico, nutrição e treino na mesma jornada.
            </p>
          </div>
        </section>

        {/* EXPERIÊNCIAS COMPARTILHADAS */}
        <section className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-2xl shadow-xl p-8 overflow-hidden border border-white/10">
              <DepoimentosAnimatedBackdrop />

              <div className="relative">
                <h2 className="text-xl font-bold text-[#0A1F44] mb-2">Experiências compartilhadas</h2>
                <p className="text-sm text-[#0A1F44]/65 mb-6">
                  Relatos individuais compartilhados espontaneamente pelos pacientes.
                </p>
                {loadingDepoimentos ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-10 w-10 text-[#4CCB7A] animate-spin" />
                    <span className="ml-3 text-[#0A1F44]/80 font-medium">Carregando relatos...</span>
                  </div>
                ) : depoimentos.length === 0 ? (
                  <p className="text-[#0A1F44]/70 text-center py-8 font-medium">Nenhuma experiência publicada ainda.</p>
                ) : (
                  <div className="relative cursor-pointer" onClick={() => setDepoimentosPausado(true)}>
                    <div key={depoimentoIndex} className="min-h-[160px] flex flex-col items-center justify-center text-center px-4 animate-fade-in">
                      <p className="text-[#0A1F44] font-semibold mb-0.5">{depoimentos[depoimentoIndex]?.nome}</p>
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
                              aria-label={`Experiência ${i + 1}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <p className="text-center text-[#E8EDED]/45 text-xs max-w-2xl mx-auto mt-6 leading-relaxed px-2">
              Os relatos são individuais e não garantem resposta semelhante. Todo acompanhamento depende de avaliação médica individualizada.
            </p>
          </div>
        </section>

        {/* INSTAGRAM DO MÉTODO — validação contínua da marca */}
        <section id="instagram-metodo" className="py-16 md:py-24 border-t border-white/10">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              <div>
                <p className="text-sm uppercase tracking-widest text-[#4CCB7A]/90 mb-2">
                  Instagram do método
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-[#E8EDED] mb-4">
                  Veja o conteúdo oficial do Método Emagrecer
                </h2>
                <p className="text-[#E8EDED]/80 text-base md:text-lg leading-relaxed mb-4">
                  Acompanhe conteúdos, bastidores e a rotina do método no perfil oficial.
                </p>
                <p className="text-[#E8EDED]/75 text-base md:text-lg leading-relaxed">
                  Educação e acompanhamento em um só lugar — para entender o processo com mais clareza.
                </p>
              </div>
              <figure
                className={
                  instagramMetodoPermalink
                    ? 'w-full max-w-[min(100%,22rem)] sm:max-w-md lg:max-w-lg mx-auto lg:mx-0 lg:ml-auto'
                    : 'w-full max-w-[min(100%,22rem)] sm:max-w-md mx-auto lg:mx-0 lg:ml-auto'
                }
              >
                <OmetodoInstagramEmbed permalink={instagramMetodoPermalink} />
              </figure>
            </div>
          </div>
        </section>

        <div className="flex justify-center pb-12">
          <button
            onClick={() => handleAcessar('/meta')}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all shadow-lg hover:shadow-[#4CCB7A]/30"
          >
            Iniciar acompanhamento
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
                { step: 1, title: 'Entrada', desc: 'Você entra por indicação do médico ou escolhe um profissional qualificado para iniciar o acompanhamento.' },
                { step: 2, title: 'Plano', desc: 'Recebe um protocolo personalizado — médico, nutrição e treino alinhados desde o início.' },
                { step: 3, title: 'Acompanhamento', desc: 'Monitoramento contínuo com suporte da equipe e organização do plano no dia a dia.' },
                { step: 4, title: 'Monitoramento', desc: 'O plano evolui com base em dados, adesão e acompanhamento contínuo da equipe.' },
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

        {showModalDepoimentosMedico && medicoSelecionadoParaDepoimentos && (
          <div className="fixed inset-x-0 top-[72px] bottom-0 z-[200] bg-black/70 md:inset-0 md:flex md:items-center md:justify-center md:p-6">
            <div className="metaadmin-home-dark-scroll relative h-full w-full overflow-y-auto bg-[#0A1F44] p-4 pr-3 sm:p-6 sm:pr-5 md:h-auto md:max-h-[min(560px,85vh)] md:w-full md:max-w-md md:rounded-2xl md:border md:border-white/10 md:shadow-2xl">
              <button
                type="button"
                onClick={() => setShowModalDepoimentosMedico(false)}
                className="absolute top-3 right-3 text-[#E8EDED]/60 hover:text-[#E8EDED]"
                aria-label="Fechar experiências compartilhadas"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="mb-5 flex items-center gap-3">
                <img
                  src={medicoSelecionadoParaDepoimentos.fotoPerfilUrl}
                  alt={`${medicoSelecionadoParaDepoimentos.genero === 'F' ? 'Dra.' : 'Dr.'} ${medicoSelecionadoParaDepoimentos.nome}`}
                  className="h-14 w-14 rounded-full object-cover border-2 border-white/25"
                />
                <div>
                  <h3 className="text-xl font-bold text-[#E8EDED] leading-tight">
                    {medicoSelecionadoParaDepoimentos.genero === 'F' ? 'Dra.' : 'Dr.'} {medicoSelecionadoParaDepoimentos.nome}
                  </h3>
                  <p className="text-sm text-[#E8EDED]/75">Experiências compartilhadas</p>
                  <p className="text-xs text-[#E8EDED]/45 mt-0.5">
                    Relatos individuais compartilhados espontaneamente pelos pacientes.
                  </p>
                </div>
              </div>

              {loadingDepoimentosMedico ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 text-[#4CCB7A] animate-spin" />
                  <span className="ml-3 text-[#E8EDED]/80">Carregando relatos...</span>
              </div>
              ) : depoimentosMedicoSelecionado.length === 0 ? (
                <p className="text-center text-[#E8EDED]/75 py-8">Este médico ainda não possui relatos públicos.</p>
              ) : (
                <div className="space-y-4">
                  {depoimentosMedicoSelecionado.map((dep, i) => (
                    <div key={dep.instanceKey || `${dep.pacienteId}_${i}`} className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                      <p className="font-semibold text-[#E8EDED]">{dep.nome}</p>
                      {(dep.cidadeEstado || dep.idade != null) && (
                        <p className="text-xs text-[#E8EDED]/65 mt-0.5">
                          {[dep.cidadeEstado, dep.idade != null ? `${dep.idade} anos` : null].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <p className="mt-3 text-sm text-[#E8EDED]/90 leading-relaxed">&quot;{dep.depoimento}&quot;</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA FINAL — fechamento de conversão */}
        <section className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-[#E8EDED] mb-4">
              Pronto para estruturar seu acompanhamento?
            </h2>
            <p className="text-[#E8EDED]/80 mb-8 max-w-2xl mx-auto">
              Integração clínica, monitoramento contínuo e rotina organizada em um só fluxo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => handleAcessar('/meta')}
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all shadow-lg hover:shadow-[#4CCB7A]/30"
              >
                Iniciar acompanhamento
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
                <img src="/og-metodo-simbolo.jpg" alt="Método Emagrecer" className="h-10 w-auto mb-4 rounded-lg" />
                <p className="text-[#E8EDED]/70 text-sm max-w-md">
                  Acompanhamento estruturado com continuidade. Oftware — Método Emagrecer.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-[#E8EDED] mb-3">Acesso</h4>
                <ul className="space-y-2">
                  <li><a href="/" className="text-[#E8EDED]/70 hover:text-[#4CCB7A] text-sm">Home</a></li>
                  <li><a href="/metodo" className="text-[#E8EDED]/70 hover:text-[#4CCB7A] text-sm">O Método</a></li>
                  <li><a href="/mentoria" className="text-[#E8EDED]/70 hover:text-[#4CCB7A] text-sm">Mentoria</a></li>
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
            <div className="mt-10 space-y-2 max-w-3xl">
              <p className="text-[#E8EDED]/40 text-xs leading-relaxed">
                Os conteúdos desta plataforma possuem caráter informativo e educacional. As condutas são individualizadas e dependem de avaliação médica.
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
