'use client';

import React, { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import LandingPageHeader from '@/components/landing/LandingPageHeader';
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
  ChevronRight,
  ChevronDown,
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

export default function HomePageClient() {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: DEEP_BLUE }}>
        <div className="animate-pulse text-[#E8EDED]">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: DEEP_BLUE }}>
      <LandingPageHeader user={user} onLogout={handleLogout} />

      <main className="pt-[72px] md:pt-[80px]">
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
                  Saúde integrada.
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4CCB7A] to-[#2F8FA3]">
                    Resultados reais.
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-[#E8EDED]/80 mb-8 max-w-xl">
                  Plataforma que une medicina, nutrição e treinamento em um único ecossistema.
                  Dados em tempo real, acompanhamento contínuo e decisões baseadas em evidências.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="button"
                    onClick={() => handleAcessar('/meta')}
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all shadow-lg hover:shadow-[#4CCB7A]/30"
                  >
                    Começar agora
                    <ArrowRight size={20} />
                  </button>
                  <button
                    type="button"
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

        {/* SLOGAN - Não é apenas sobre dieta. É sobre método. */}
        <section className="py-16 md:py-24">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="order-2 lg:order-1">
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#E8EDED] leading-tight mb-4">
                  Não é apenas sobre dieta.
                </p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#4CCB7A] to-[#2F8FA3] leading-tight">
                  É sobre método.
                </p>
                <p className="text-[#E8EDED]/70 mt-6 text-lg max-w-lg">
                  A Oftware oferece o método completo: acompanhamento médico, nutricional e de treino integrados em uma única plataforma.
                </p>
              </div>
              <div className="order-1 lg:order-2 flex justify-center">
                <img
                  src="/criativo-metodo.png"
                  alt="Não é apenas sobre dieta. É sobre método."
                  className="w-full max-w-sm md:max-w-md rounded-2xl shadow-2xl object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2. PROBLEMA / OPORTUNIDADE */}
        <section className="py-16 md:py-24">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-[#E8EDED] text-center mb-4">
              O desafio que resolvemos
            </h2>
            <p className="text-[#E8EDED]/70 text-center max-w-2xl mx-auto mb-12">
              Clínicas, médicos e pacientes enfrentam dores que a Oftware elimina com tecnologia e integração.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { title: 'Clínicas', items: ['Gestão fragmentada', 'Falta de visão unificada', 'Processos manuais'] },
                { title: 'Médicos', items: ['Dificuldade de vínculo multidisciplinar', 'Dados dispersos', 'Pacientes desengajados'] },
                { title: 'Pacientes', items: ['Múltiplos apps e planos', 'Falta de acompanhamento integrado', 'Resultados inconsistentes'] },
              ].map((block) => (
                <div key={block.title} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#4CCB7A]/30 transition-colors">
                  <h3 className="text-xl font-bold text-[#4CCB7A] mb-4">{block.title}</h3>
                  <ul className="space-y-2">
                    {block.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-[#E8EDED]/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4CCB7A]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. BENEFÍCIOS */}
        <section className="py-16 md:py-24 bg-white/5">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-[#E8EDED] text-center mb-4">Por que a Oftware</h2>
            <p className="text-[#E8EDED]/70 text-center max-w-2xl mx-auto mb-12">
              Diferenciais que elevam a gestão de saúde e a experiência do paciente.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: LayoutDashboard, title: 'Gestão unificada', desc: 'Tudo em um só lugar: pacientes, vínculos, prescrições e evolução.' },
                { icon: MessageCircle, title: 'Telemedicina integrada', desc: 'Comunicação direta entre médico, nutri, personal e paciente.' },
                { icon: UserCheck, title: 'Experiência do paciente', desc: 'App intuitivo com planos, treinos e acompanhamento em tempo real.' },
                { icon: Zap, title: 'Automação inteligente', desc: 'Menos trabalho manual, mais tempo para o que importa.' },
                { icon: BarChart3, title: 'Integração de dados', desc: 'Métricas, gráficos e decisões baseadas em evidências.' },
                { icon: Users, title: 'Escalabilidade', desc: 'Cresça sem perder controle. Plataforma robusta e confiável.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="p-6 rounded-2xl bg-[#0A1F44] border border-white/10 hover:border-[#4CCB7A]/40 transition-all group">
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

        {/* 4. COMO FUNCIONA */}
        <section id="como-funciona" className="py-16 md:py-24">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-[#E8EDED] text-center mb-4">Como funciona</h2>
            <p className="text-[#E8EDED]/70 text-center max-w-2xl mx-auto mb-12">
              Em poucos passos, sua clínica ou consultório está integrado e operando em alto nível.
            </p>
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: 1, title: 'Cadastre-se', desc: 'Médicos, nutricionistas e personais criam suas contas.' },
                { step: 2, title: 'Vincule a equipe', desc: 'Conecte médicos, nutri e personais em rede multidisciplinar.' },
                { step: 3, title: 'Engaje pacientes', desc: 'Pacientes acessam planos, treinos e acompanhamento.' },
                { step: 4, title: 'Acompanhe resultados', desc: 'Dados em tempo real, métricas e evolução clínica.' },
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

        {/* 5. MÓDULOS / ECOSSISTEMA */}
        <section className="py-16 md:py-24 bg-white/5">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-[#E8EDED] text-center mb-4">Ecossistema completo</h2>
            <p className="text-[#E8EDED]/70 text-center max-w-2xl mx-auto mb-12">
              Uma plataforma robusta com módulos para cada frente da sua operação.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Stethoscope, title: 'MetaAdmin', desc: 'Área do médico e gestão da clínica.' },
                { icon: UserCheck, title: 'Meta', desc: 'App do paciente com dashboard e acompanhamento.' },
                { icon: UtensilsCrossed, title: 'MetaNutri', desc: 'Planos alimentares e vínculo com médicos.' },
                { icon: Dumbbell, title: 'MetaPersonal', desc: 'Treinos, agenda e evolução do aluno.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="p-6 rounded-2xl bg-[#0A1F44] border border-white/10 hover:border-[#2F8FA3]/50 transition-all flex flex-col">
                  <Icon className="w-10 h-10 text-[#4CCB7A] mb-4" />
                  <h3 className="text-lg font-bold text-[#E8EDED] mb-2">{title}</h3>
                  <p className="text-[#E8EDED]/70 text-sm flex-1">{desc}</p>
                  <ChevronRight className="w-5 h-5 text-[#4CCB7A] mt-2" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. PROVA DE VALOR */}
        <section className="py-16 md:py-24">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-[#E8EDED] text-center mb-4">Resultados tangíveis</h2>
            <p className="text-[#E8EDED]/70 text-center max-w-2xl mx-auto mb-12">Mais controle, mais adesão, mais eficiência.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { value: '+ Controle', label: 'Gestão centralizada e visão unificada' },
                { value: '+ Adesão', label: 'Pacientes engajados com acompanhamento integrado' },
                { value: '+ Eficiência', label: 'Menos atrito operacional e processos automatizados' },
                { value: '- Complexidade', label: 'Uma plataforma para toda a equipe multidisciplinar' },
              ].map(({ value, label }) => (
                <div key={value} className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <p className="text-2xl font-bold text-[#4CCB7A] mb-2">{value}</p>
                  <p className="text-[#E8EDED]/80 text-sm">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. CREDIBILIDADE - DEPOIMENTOS REAIS */}
        <section className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-2xl shadow-xl p-8 overflow-hidden">
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/90 via-purple-50/90 to-orange-50/90 animate-gradient-shift opacity-80" />
                <div className="absolute inset-0">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute rounded-full opacity-25 animate-float"
                      style={{
                        left: `${(i * 12) % 100}%`,
                        top: `${(i * 17) % 100}%`,
                        width: `${60 + i * 10}px`,
                        height: `${60 + i * 10}px`,
                        background: `linear-gradient(135deg, ${i % 3 === 0 ? 'rgba(76, 203, 122, 0.4)' : i % 3 === 1 ? 'rgba(47, 143, 163, 0.35)' : 'rgba(249, 115, 22, 0.35)'}, transparent)`,
                        animationDelay: `${i * 0.8}s`,
                        animationDuration: `${14 + i * 2}s`,
                      }}
                    />
                  ))}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-white/60 to-transparent" />
              </div>

              <div className="relative">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Depoimentos</h2>
                {loadingDepoimentos ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-10 w-10 text-green-600 animate-spin" />
                    <span className="ml-3 text-gray-700 font-medium">Carregando depoimentos...</span>
                  </div>
                ) : depoimentos.length === 0 ? (
                  <p className="text-gray-600 text-center py-8 font-medium">Nenhum depoimento publicado ainda.</p>
                ) : (
                  <div className="relative cursor-pointer" onClick={() => setDepoimentosPausado(true)}>
                    <div key={depoimentoIndex} className="min-h-[160px] flex flex-col items-center justify-center text-center px-4 animate-fade-in">
                      <div className="flex items-center justify-center gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={20}
                            className={s <= (depoimentos[depoimentoIndex]?.estrelas ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-center gap-3 mb-0.5">
                        <p className="text-gray-900 font-semibold">{depoimentos[depoimentoIndex]?.nome}</p>
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
                        <p className="text-gray-600 text-sm mb-2">
                          {[depoimentos[depoimentoIndex]?.cidadeEstado, depoimentos[depoimentoIndex]?.idade != null ? `${depoimentos[depoimentoIndex]?.idade} anos` : null].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <p className="text-gray-700 leading-relaxed max-w-2xl">&quot;{depoimentos[depoimentoIndex]?.depoimento}&quot;</p>
                    </div>

                    {depoimentos.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDepoimentoIndex((i) => (i - 1 + depoimentos.length) % depoimentos.length); }}
                          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                          aria-label="Anterior"
                        >
                          <ChevronDown className="h-5 w-5 rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDepoimentoIndex((i) => (i + 1) % depoimentos.length); }}
                          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
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
                              className={`w-2 h-2 rounded-full transition-colors ${i === depoimentoIndex ? 'bg-green-600' : 'bg-gray-300 hover:bg-gray-400'}`}
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

        {/* 8. CTA FINAL */}
        <section className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-[#E8EDED] mb-4">
              Pronto para transformar sua gestão de saúde?
            </h2>
            <p className="text-[#E8EDED]/80 mb-8 max-w-2xl mx-auto">
              Junte-se a clínicas e profissionais que já usam a Oftware para oferecer o melhor acompanhamento aos pacientes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="button"
                onClick={() => handleAcessar('/meta')}
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all shadow-lg hover:shadow-[#4CCB7A]/30"
              >
                Acessar plataforma
                <ArrowRight size={20} />
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl font-semibold text-[#E8EDED] border-2 border-[#E8EDED]/40 hover:border-[#4CCB7A] hover:text-[#4CCB7A] transition-all"
              >
                Como funciona
              </button>
            </div>
          </div>
        </section>

        {/* 9. FOOTER */}
        <footer className="border-t border-white/10 py-12">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="md:col-span-2">
                <img src="/logo-site.jpg" alt="Oftware" className="h-10 w-auto mb-4" />
                <p className="text-[#E8EDED]/70 text-sm max-w-md">
                  Plataforma de gestão médica integrada. Medicina, nutrição e treinamento em um único ecossistema.
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

      {loginError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-3 rounded-lg text-sm shadow-lg z-50 max-w-md flex items-center gap-2">
          {loginError}
          <button type="button" onClick={() => setLoginError(null)} className="p-1 hover:bg-white/20 rounded">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
