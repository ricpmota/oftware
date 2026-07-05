'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  ArrowRight,
  Check,
  Package,
  RefreshCw,
  Layers,
  Cpu,
  Star,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Loader2,
  CalendarDays,
  Wallet,
  TrendingUp,
  ListOrdered,
} from 'lucide-react';
import Countdown from '@/components/mentoria/Countdown';
import MentoriaLeadModal from '@/components/mentoria/MentoriaLeadModal';
import IndicadoresPlataforma from '@/components/landing/IndicadoresPlataforma';
import { useMentoriaLeadModal } from '@/hooks/useMentoriaLeadModal';
import InitialLoadingSplash from '@/components/landing/InitialLoadingSplash';
import OmetodoInstagramEmbed from '@/components/mentoria/OmetodoInstagramEmbed';
import { ometodoInstagramPermalink } from '@/lib/ometodoInstagram';

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

const MEDICO_EMAIL_DEPOIMENTOS = 'ricpmota.med@gmail.com';

const DEEP_BLUE = '#0A1F44';
const GREEN = '#4CCB7A';
const TEAL = '#2F8FA3';
const LIGHT = '#E8EDED';

/** CTA principal – ajuste o href conforme integração (WhatsApp, checkout, etc.) */
const MIN_SPLASH_MS = 900;

type CronogramaDia = {
  dia: string;
  titulo: string;
  objetivo: string;
  detalhes: string[];
};

type EtapaMonetizar = {
  titulo: string;
  descricao: string;
  pontos: string[];
  nota?: string;
};

/** 10 etapas do conteúdo “monetizar medicina” — textos expandidos para o carrossel. */
const ETAPAS_MONETIZAR: EtapaMonetizar[] = [
  {
    titulo: 'Como atrair pacientes pela internet',
    descricao:
      'Você aprende a posicionar sua autoridade no digital sem depender só de indicação: o paciente certo precisa te encontrar antes da consulta, já entendendo o tipo de acompanhamento que você oferece.',
    pontos: [
      'Funil simples: atenção → interesse → conversa qualificada.',
      'Conteúdo e prova social alinhados ao programa, não à consulta avulsa.',
      'Canais (orgânico e pago) com mensagem consistente e compliance.',
    ],
    nota: 'Objetivo: gerar demanda contínua sem inflar trabalho operacional.',
  },
  {
    titulo: 'Como vender acompanhamento online',
    descricao:
      'A conversa deixa de ser “preço de consulta” e passa a ser continuidade, resultado e acompanhamento — com clareza do que está incluso no programa e por que faz sentido pagar mais por um processo.',
    pontos: [
      'Estrutura de oferta: duração, entregáveis, limites e suporte.',
      'Objeções comuns (tempo, preço, medo) respondidas com método.',
      'Fechamento sem pressão: decisão informada do paciente.',
    ],
  },
  {
    titulo: 'Como estruturar um produto digital médico',
    descricao:
      'Produto digital médico é o pacote de valor: protocolo, revisões, canais de contato, materiais e ritmo de evolução. Você organiza isso para escalar sem perder segurança assistencial.',
    pontos: [
      'Definição do “core” do programa vs. opcionais.',
      'Documentação leve para padronizar a experiência.',
      'Precificação coerente com o valor percebido e com o mercado.',
    ],
  },
  {
    titulo: 'Como escalar sem consultório',
    descricao:
      'O consultório deixa de ser gargalo geográfico: o modelo digital permite atender de onde estiver, com agenda e limites definidos por você — não pela fila da recepção.',
    pontos: [
      'Fluxo remoto-first: exames, adesão e follow-up.',
      'Limites éticos e legais bem desenhados no online.',
      'Comunicação e acompanhamento com ritmo sustentável.',
    ],
  },
  {
    titulo: 'Como transformar consulta em programa',
    descricao:
      'Consulta isolada gera pico de receita e vazio depois. Programa cria continuidade: checkpoints, ajustes e relacionamento — o que sustenta resultado do paciente e previsibilidade para você.',
    pontos: [
      'Do episódio único ao plano em semanas/meses.',
      'Indicadores de evolução que o paciente enxerga.',
      'Revisões programadas em vez de “voltar quando quiser”.',
    ],
  },
  {
    titulo: 'Como cobrar alto sem perder paciente',
    descricao:
      'Preço alto sem valor claro afasta; com valor claro, atrai paciente comprometido. A mentoria trabalha posicionamento, empaque da oferta e linguagem para sustentar ticket maior.',
    pontos: [
      'Âncoras de valor (o que muda na vida do paciente).',
      'Transparência no que está incluso evita atrito pós-venda.',
      'Segmentação: nem todo mundo é seu paciente — e tudo bem.',
    ],
  },
  {
    titulo: 'Como criar recorrência mensal',
    descricao:
      'Recorrência não é “cobrar de novo”: é manter o paciente no protocolo com entregas contínuas (acompanhamento, ajustes, suporte) que justificam a mensalidade.',
    pontos: [
      'Modelos de assinatura / renovação alinhados ao tratamento.',
      'Comunicação de renovação antes do vazio assistencial.',
      'Indicadores de engajamento para antecipar churn.',
    ],
  },
  {
    titulo: 'Como gerar previsibilidade de receita',
    descricao:
      'Previsibilidade vem de pipeline e ritmo: quantos leads, quantas conversões, ticket médio e taxa de permanência. Você deixa de “torcer para o mês fechar” e passa a enxergar alavancas.',
    pontos: [
      'Metas semanais simples (leads, conversões, retenção).',
      'Visão de receita já contratada vs. a conquistar.',
      'Ajuste fino quando um indicador desanda.',
    ],
  },
  {
    titulo: 'Como escalar sem aumentar carga de trabalho',
    descricao:
      'Escalar com mais horas na frente do vídeo não escala de verdade. O caminho é processo, tecnologia e desenho de oferta que concentram impacto onde importa.',
    pontos: [
      'Automatizar o repetitivo; humanizar o decisório.',
      'Delegação (equipe / plataforma) dentro do modelo ensinado.',
      'Limites de agenda para proteger qualidade e saúde.',
    ],
  },
  {
    titulo: 'Como usar tecnologia para automatizar',
    descricao:
      'A Oftware entra como espinha dorsal: registro, evolução, comunicação e rotina clínica com menos atrito. Você usa o sistema como alavanca, não como mais uma tela para preencher.',
    pontos: [
      'Fluxos que lembram o paciente e você do que falta.',
      'Menos retrabalho: dados e histórico centralizados.',
      'Experiência do paciente mais fluida = mais adesão.',
    ],
    nota: 'Depois desta fase, o calendário da mentoria entra nos 6 dias práticos no ecossistema.',
  },
];

const cronogramaMentoria: CronogramaDia[] = [
  {
    dia: 'Dia 1',
    titulo: 'Domínio do Ecossistema',
    objetivo: 'Entender como todas as áreas do sistema se conectam.',
    detalhes: [
      'Apresentação do Metaadmin',
      'Apresentação do Meta',
      'Apresentação do Metanutri',
      'Apresentação do Metapersonal',
      'Entendimento do papel de cada ambiente dentro do tratamento',
    ],
  },
  {
    dia: 'Dia 2',
    titulo: 'Ciclo de Receita',
    objetivo: 'Entender o fluxo completo da venda até o acompanhamento do paciente.',
    detalhes: [
      'Tratar o lead',
      'Cadastro do paciente',
      'Solicitação de exames',
      'Plano terapêutico',
      'Envio do kit para a casa do paciente',
      'Início do acompanhamento',
      'Visão prática do fluxo operacional',
    ],
  },
  {
    dia: 'Dia 3',
    titulo: 'Aquisição de Pacientes',
    objetivo: 'Aprender as principais formas de captação de leads.',
    detalhes: [
      'Tipos de captação de leads',
      'Uso do link pessoal do médico',
      'Estratégias iniciais de atração',
      'Entrada do paciente no sistema já vinculado ao médico',
    ],
  },
  {
    dia: 'Dia 4',
    titulo: 'Controle Financeiro',
    objetivo: 'Dominar a gestão financeira do tratamento dentro da plataforma.',
    detalhes: [
      'Controle de vendas',
      'Receita presente e futura',
      'Organização financeira da operação',
      'Visão de previsibilidade',
    ],
  },
  {
    dia: 'Dia 5',
    titulo: 'Acompanhamento e Retenção',
    objetivo:
      'Entender a rotina diária de acompanhamento e as oportunidades de continuidade.',
    detalhes: [
      'Acompanhamento diário dos pacientes',
      'Uso do calendário',
      'Solicitação de peso e circunferência abdominal',
      'Pós-venda',
      'Possibilidade de revenda quando o ciclo estiver finalizando',
    ],
  },
  {
    dia: 'Dia 6',
    titulo: 'Consolidação do Modelo',
    objetivo: 'Fechar a visão completa do processo e consolidar a operação.',
    detalhes: [
      'Encerramento',
      'Revisão do fluxo',
      'Organização da rotina do médico',
      'Consolidação do modelo digital de acompanhamento',
    ],
  },
];

const DIAS_SEMANA_MENTORIA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
type MobileJornadaModal = 'conteudo' | 'calendario' | null;

const carrosselSlideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 36 : -36,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? -36 : 36,
    opacity: 0,
  }),
};

export default function MentoriaPage() {
  const router = useRouter();
  const instagramMetodoPermalink = ometodoInstagramPermalink();
  const splashMountRef = useRef(Date.now());
  const [showSplash, setShowSplash] = useState(true);
  const [mobileJornadaModal, setMobileJornadaModal] = useState<MobileJornadaModal>(null);
  const [etapaMonetizarIndex, setEtapaMonetizarIndex] = useState(0);
  const [etapaMonetizarDir, setEtapaMonetizarDir] = useState(0);
  const [diaMentoriaIndex, setDiaMentoriaIndex] = useState(0);
  const [diaMentoriaDir, setDiaMentoriaDir] = useState(0);

  const goEtapaMonetizar = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= ETAPAS_MONETIZAR.length) return;
    setEtapaMonetizarDir(newIndex > etapaMonetizarIndex ? 1 : -1);
    setEtapaMonetizarIndex(newIndex);
  };

  const goDiaMentoria = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= cronogramaMentoria.length) return;
    setDiaMentoriaDir(newIndex > diaMentoriaIndex ? 1 : -1);
    setDiaMentoriaIndex(newIndex);
  };

  const etapaMonetizarAtual = ETAPAS_MONETIZAR[etapaMonetizarIndex];
  const diaMentoriaAtual = cronogramaMentoria[diaMentoriaIndex];

  const [fixedCtaVisible, setFixedCtaVisible] = useState(false);
  const leadModal = useMentoriaLeadModal();
  const [depoimentos, setDepoimentos] = useState<DepoimentoItem[]>([]);
  const [loadingDepoimentos, setLoadingDepoimentos] = useState(true);
  const [depoimentoIndex, setDepoimentoIndex] = useState(0);
  const [depoimentosPausado, setDepoimentosPausado] = useState(false);
  useEffect(() => {
    fetch(`/api/depoimentos-medico?medicoEmail=${encodeURIComponent(MEDICO_EMAIL_DEPOIMENTOS)}`)
      .then((res) => (res.ok ? res.json() : { depoimentos: [] }))
      .then((data: { depoimentos: DepoimentoItem[] }) => {
        setDepoimentos(data.depoimentos || []);
        setDepoimentoIndex(0);
      })
      .catch(() => setDepoimentos([]))
      .finally(() => setLoadingDepoimentos(false));
  }, []);

  /** Mesmo padrão do /metaadmingeral: URL com ?_v=&_t= para não ficar preso em HTML/chunks em cache (inclui navegação client-side). */
  useEffect(() => {
    let cancelled = false;
    fetch('/api/version', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { version?: string | number }) => {
        if (cancelled) return;
        const current =
          d && typeof d.version !== 'undefined' ? String(d.version) : '';
        if (!current) return;
        const params = new URLSearchParams(window.location.search);
        const v = params.get('_v');
        const t = params.get('_t');
        if (v === current && t) return;
        params.delete('_v');
        params.delete('_t');
        params.set('_v', current);
        params.set('_t', String(Date.now()));
        const q = params.toString();
        router.replace(q ? `/mentoria?${q}` : `/mentoria?_v=${encodeURIComponent(current)}&_t=${Date.now()}`);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (depoimentos.length <= 1 || depoimentosPausado) return;
    const t = setInterval(() => {
      setDepoimentoIndex((i) => (i + 1) % depoimentos.length);
    }, 8000);
    return () => clearInterval(t);
  }, [depoimentos.length, depoimentosPausado]);

  React.useEffect(() => {
    const onScroll = () => {
      const hero = document.querySelector('section');
      if (!hero) return;
      const heroBottom = hero.getBoundingClientRect().bottom;
      setFixedCtaVisible(window.scrollY > heroBottom - 100);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!mobileJornadaModal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileJornadaModal]);

  useEffect(() => {
    if (loadingDepoimentos) return;
    const elapsed = Date.now() - splashMountRef.current;
    const delay = Math.max(0, MIN_SPLASH_MS - elapsed);
    const id = window.setTimeout(() => setShowSplash(false), delay);
    return () => window.clearTimeout(id);
  }, [loadingDepoimentos]);

  const ctaButtonClass =
    'inline-flex items-center justify-center gap-2 px-6 py-4 sm:px-8 sm:py-4 rounded-xl font-bold text-[#0A1F44] transition-all duration-300 shadow-lg active:scale-[0.98] hover:shadow-[#4CCB7A]/40 hover:shadow-xl bg-[#4CCB7A] hover:bg-[#45b86d] hover:-translate-y-0.5';

  if (showSplash) {
    return <InitialLoadingSplash backgroundColor={DEEP_BLUE} />;
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden relative"
      style={{ backgroundColor: DEEP_BLUE }}
    >
      {/* Fixed CTA Mobile */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={fixedCtaVisible ? { y: 0, opacity: 1 } : { y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:hidden"
      >
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={leadModal.open}
            className="w-full py-4 rounded-xl font-bold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] shadow-lg shadow-[#4CCB7A]/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            Quero entrar no modelo digital
            <ArrowRight size={20} />
          </button>
        </div>
      </motion.div>

      {/* Header minimalista */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#0A1F44]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <img
              src="/oftware-site-novo2.png"
              alt="Oftware"
              className="h-8 md:h-9 w-auto object-contain"
            />
          </Link>
          <div className="flex items-center gap-3">
            <Countdown />
            <button
              type="button"
              onClick={leadModal.open}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all"
            >
              Entrar agora
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-[72px] md:pt-[80px]">
        {/* Marca d'água sutil Oftware */}
        <div
          className="fixed top-[72px] md:top-[80px] right-0 z-[25] flex items-start justify-end p-3 sm:p-5 pointer-events-none"
          aria-hidden
        >
          <img
            src="/oftware-site-novo2.png"
            alt=""
            className="w-[min(160px,28vw)] h-auto opacity-[0.04]"
          />
        </div>

        {/* HERO */}
        <section className="relative min-h-[85vh] sm:min-h-[90vh] flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6">
          <div
            className="absolute inset-0 opacity-90"
            style={{
              background: `linear-gradient(135deg, ${DEEP_BLUE} 0%, #0d2a5a 40%, #0a2647 70%, ${DEEP_BLUE} 100%)`,
            }}
          />
          <div className="absolute inset-0 opacity-30">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full animate-float"
                style={{
                  left: `${(i * 12) % 100}%`,
                  top: `${(i * 14) % 100}%`,
                  width: `${60 + i * 12}px`,
                  height: `${60 + i * 12}px`,
                  background: `radial-gradient(circle, rgba(76, 203, 122, 0.25), transparent 70%)`,
                  animationDelay: `${i * 0.4}s`,
                }}
              />
            ))}
          </div>

          <motion.div
            className="relative max-w-4xl mx-auto text-center"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-sm uppercase tracking-[0.22em] text-[#4CCB7A]/90 mb-4">
              Mentoria Médica · Produto Oftware
            </p>
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.15] mb-6"
              style={{ color: LIGHT }}
            >
              Você não precisa de consultório para faturar alto com medicina.
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-[#E8EDED]/85 mb-10 max-w-2xl mx-auto">
              Aprenda a transformar seu conhecimento em uma operação digital escalável sobre a
              infraestrutura White Label da Oftware.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <button
                type="button"
                onClick={leadModal.open}
                className={`${ctaButtonClass} text-lg sm:text-xl px-10 py-5`}
              >
                Quero faturar online com medicina
                <ArrowRight size={22} />
              </button>
            </motion.div>
          </motion.div>
        </section>

        {/* OPORTUNIDADE */}
        <section className="py-20 sm:py-28 px-4 sm:px-6 bg-white/5">
          <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
            <motion.h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6"
              style={{ color: LIGHT }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              O mercado já mudou. E você ainda não percebeu.
            </motion.h2>
            <motion.p
              className="text-lg sm:text-xl text-[#E8EDED]/80 mb-6 max-w-xl"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              Médicos que estruturam programas de acompanhamento online estão
              faturando múltiplos do modelo tradicional — com menos pacientes e
              mais previsibilidade.
            </motion.p>
            <motion.p
              className="text-xl sm:text-2xl font-bold"
              style={{ color: GREEN }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Não é sobre encher agenda. É sobre escalar sem depender dela.
            </motion.p>
          </div>
        </section>

        {/* PLATAFORMA OFTWARE */}
        <section className="py-20 sm:py-28 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <motion.h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8"
              style={{ color: LIGHT }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              O que separa médicos comuns de médicos que escalam
            </motion.h2>
            <motion.p
              className="text-lg text-[#4CCB7A] font-semibold text-center mb-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              A Oftware entrega a infraestrutura. A mentoria ensina a operação comercial e clínica.
            </motion.p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { icon: Package, title: 'Captação digital', sub: 'de pacientes' },
                { icon: RefreshCw, title: 'Conversão online', sub: 'não visita única' },
                { icon: Layers, title: 'Acompanhamento remoto', sub: 'não presencial' },
                { icon: Cpu, title: 'Tecnologia', sub: 'Oftware' },
              ].map(({ icon: Icon, title, sub }, i) => (
                <motion.div
                  key={title}
                  className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:border-[#4CCB7A]/40 transition-all duration-300 text-center"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-[#E8EDED] mb-1">{title}</h3>
                  <p className="text-sm text-[#E8EDED]/70">({sub})</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* INDICADORES / RESULTADOS CONQUISTADOS — mesmo bloco da home */}
        <IndicadoresPlataforma variant="institutional" />

        {/* ECOSSISTEMA OFTWARE */}
        <section
          id="ecossistema-oftware"
          className="py-20 sm:py-28 px-4 sm:px-6 scroll-mt-24 border-t border-white/10"
        >
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <p className="text-sm uppercase tracking-widest text-[#4CCB7A]/90 mb-2">
                  Ecossistema Oftware
                </p>
                <h2
                  className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6"
                  style={{ color: LIGHT }}
                >
                  Marca, alcance e confiança para quem entra na rede
                </h2>
                <p className="text-[#E8EDED]/85 text-base sm:text-lg leading-relaxed mb-4">
                  A Oftware produz conteúdo e investe em presença digital para fortalecer o
                  posicionamento de médicos que constroem sobre a plataforma — sempre alinhado
                  à operação clínica e ao acompanhamento estruturado.
                </p>
                <p className="text-[#E8EDED]/85 text-base sm:text-lg leading-relaxed">
                  Esse esforço de marca e alcance{' '}
                  <span className="text-[#4CCB7A] font-semibold">reflete diretamente</span>{' '}
                  para os médicos da rede: mais reconhecimento, mais confiança do paciente e
                  demanda qualificada convergindo para sua operação.
                </p>
              </motion.div>
              <motion.figure
                className={
                  instagramMetodoPermalink
                    ? 'w-full max-w-[min(100%,22rem)] sm:max-w-md lg:max-w-lg mx-auto lg:mx-0 lg:ml-auto'
                    : 'w-full max-w-[min(100%,22rem)] sm:max-w-md mx-auto lg:mx-0 lg:ml-auto'
                }
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 }}
              >
                <OmetodoInstagramEmbed permalink={instagramMetodoPermalink} />
              </motion.figure>
            </div>
          </div>
        </section>

        {/* DEPOIMENTOS */}
        <section className="py-20 sm:py-28 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="relative rounded-2xl shadow-xl p-8 overflow-hidden border border-white/10">
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div
                  className="absolute inset-0 animate-gradient-shift opacity-100"
                  style={{
                    background: 'linear-gradient(135deg, rgba(232, 237, 237, 0.97) 0%, rgba(220, 245, 235, 0.95) 25%, rgba(232, 237, 237, 0.97) 50%, rgba(215, 238, 245, 0.95) 75%, rgba(232, 237, 237, 0.97) 100%)',
                    backgroundSize: '200% 200%',
                  }}
                />
                <div className="absolute inset-0">
                  {[...Array(14)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute rounded-full animate-float-depoimentos will-change-transform"
                      style={{
                        left: `${(i * 7 + 3) % 100}%`,
                        top: `${(i * 11 + 5) % 100}%`,
                        width: `${50 + (i % 5) * 18}px`,
                        height: `${50 + (i % 5) * 18}px`,
                        background: `radial-gradient(circle, ${
                          i % 2 === 0 ? 'rgba(76, 203, 122, 0.25)' : 'rgba(47, 143, 163, 0.2)'
                        } 0%, transparent 70%)`,
                        animationDelay: `${i * 0.6}s`,
                        animationDuration: `${18 + (i % 4) * 3}s`,
                      }}
                    />
                  ))}
                </div>
                <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-gradient-to-br from-[#4CCB7A]/10 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-[#2F8FA3]/10 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-[#E8EDED]/90 to-transparent" />
              </div>

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

        {/* JORNADA 1 — conteúdo (etapas 1 a 10), horizontal */}
        <section
          id="jornada-conteudo"
          className="py-20 sm:py-28 px-4 sm:px-6 scroll-mt-24 border-t border-white/10"
        >
          <div className="max-w-4xl mx-auto">
            <motion.div
              className="text-center mb-8 sm:mb-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-sm uppercase tracking-widest text-[#4CCB7A]/90 mb-2">
                Cronograma de conteúdo
              </p>
              <h2
                className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 leading-tight"
                style={{ color: LIGHT }}
              >
                Você não vai aprender medicina.{' '}
                <span className="text-[#4CCB7A]">Vai aprender a monetizar ela.</span>
              </h2>
              <p className="text-base sm:text-lg text-[#E8EDED]/75 leading-relaxed max-w-2xl mx-auto">
                Dez etapas em sequência. Avance com <span className="text-[#4CCB7A] font-medium">Próximo</span> ou
                toque no número da etapa.
              </p>
            </motion.div>

            <div className="sm:hidden">
              <button
                type="button"
                onClick={() => setMobileJornadaModal('conteudo')}
                className="w-full min-h-[52px] rounded-xl border border-[#4CCB7A]/40 bg-[#4CCB7A]/15 px-5 py-3.5 text-sm font-semibold text-[#4CCB7A]"
              >
                Abrir jornada de conteúdo (1–10)
              </button>
            </div>

            <div className="hidden sm:block">
            <div className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-[#0A1F44]/60 shadow-xl shadow-black/25 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-3 sm:px-5 sm:py-4">
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-[#E8EDED]/40"
                  disabled
                  aria-hidden
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                  <ListOrdered className="h-5 w-5 shrink-0 text-[#4CCB7A]" aria-hidden />
                  <div className="min-w-0 text-center">
                    <p className="truncate text-xs font-semibold uppercase tracking-wider text-[#4CCB7A]/90">
                      Conteúdo · 10 etapas
                    </p>
                    <p className="truncate text-sm font-bold text-[#E8EDED] sm:text-base">
                      Sequência do programa (visão em grade)
                    </p>
                  </div>
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

              <div className="grid grid-cols-10 divide-x divide-white/5 border-b border-white/10 bg-white/[0.04] p-2 sm:p-3">
                {ETAPAS_MONETIZAR.map((etapa, i) => {
                  const sel = i === etapaMonetizarIndex;
                  const num = String(i + 1).padStart(2, '0');
                  return (
                    <button
                      key={etapa.titulo}
                      type="button"
                      onClick={() => goEtapaMonetizar(i)}
                      className={`flex min-h-[72px] flex-col items-center justify-center px-0.5 py-2 text-center transition-all sm:min-h-[88px] ${
                        sel
                          ? 'bg-[#4CCB7A]/15 ring-1 ring-inset ring-[#4CCB7A]/50'
                          : 'hover:bg-white/5'
                      }`}
                      aria-label={`Etapa ${num} — ${etapa.titulo}`}
                      aria-current={sel ? 'step' : undefined}
                    >
                      <span
                        className={`text-lg font-bold tabular-nums sm:text-xl md:text-2xl ${
                          sel ? 'text-[#4CCB7A]' : 'text-[#E8EDED]'
                        }`}
                      >
                        {num}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-[#E8EDED]/70">
              <span>
                Etapa{' '}
                <span className="font-semibold text-[#4CCB7A]">{etapaMonetizarIndex + 1}</span>
                {' / '}
                {ETAPAS_MONETIZAR.length}
              </span>
              <span className="text-[#E8EDED]/60">Conteúdo · modelo digital</span>
            </div>

            <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#4CCB7A] to-[#2F8FA3]"
                initial={false}
                animate={{
                  width: `${((etapaMonetizarIndex + 1) / ETAPAS_MONETIZAR.length) * 100}%`,
                }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
              <button
                type="button"
                aria-label="Etapa anterior"
                disabled={etapaMonetizarIndex === 0}
                onClick={() => goEtapaMonetizar(etapaMonetizarIndex - 1)}
                className="order-2 hidden min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[#4CCB7A] transition-colors hover:border-[#4CCB7A]/35 sm:order-none sm:flex sm:h-auto sm:w-12 sm:min-h-0 sm:flex-col sm:px-0"
              >
                <ChevronLeft className="h-6 w-6 sm:mx-auto" />
                <span className="sm:sr-only">Anterior</span>
              </button>

              <div className="order-1 min-h-[min(24rem,62svh)] flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-black/20 sm:order-none sm:min-h-[300px]">
                <AnimatePresence initial={false} custom={etapaMonetizarDir} mode="wait">
                  <motion.div
                    key={etapaMonetizarIndex}
                    custom={etapaMonetizarDir}
                    variants={carrosselSlideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full p-5 sm:p-8"
                  >
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <span className="rounded-lg border border-[#4CCB7A]/30 bg-[#4CCB7A]/10 px-2.5 py-1 text-xs font-bold text-[#4CCB7A]">
                        Etapa {String(etapaMonetizarIndex + 1).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#E8EDED]/50">
                        de {String(ETAPAS_MONETIZAR.length).padStart(2, '0')}
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold leading-snug text-[#E8EDED] mb-4">
                      {etapaMonetizarAtual.titulo}
                    </h3>
                    <p className="text-sm sm:text-base text-[#E8EDED]/85 leading-relaxed mb-5">
                      {etapaMonetizarAtual.descricao}
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#4CCB7A] mb-2">
                      Em foco
                    </p>
                    <ul className="space-y-2.5">
                      {etapaMonetizarAtual.pontos.map((p) => (
                        <li key={p} className="flex gap-3 text-sm sm:text-base text-[#E8EDED]/90">
                          <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#4CCB7A]" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                    {etapaMonetizarAtual.nota && (
                      <p className="mt-6 rounded-xl border border-white/10 bg-[#0A1F44]/40 px-4 py-3 text-sm text-[#E8EDED]/70 leading-relaxed">
                        {etapaMonetizarAtual.nota}
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <button
                type="button"
                aria-label="Próxima etapa"
                disabled={etapaMonetizarIndex >= ETAPAS_MONETIZAR.length - 1}
                onClick={() => goEtapaMonetizar(etapaMonetizarIndex + 1)}
                className="order-3 hidden min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-[#4CCB7A]/40 bg-gradient-to-r from-[#4CCB7A]/20 to-[#2F8FA3]/15 text-sm font-semibold text-[#4CCB7A] transition-all hover:border-[#4CCB7A]/60 hover:from-[#4CCB7A]/30 sm:flex sm:h-auto sm:w-12 sm:flex-col sm:px-0 sm:py-4"
              >
                <ChevronRight className="h-6 w-6 sm:mx-auto" />
                <span className="sm:sr-only">Próximo</span>
              </button>
            </div>

            </div>
          </div>
        </section>

        {/* JORNADA 2 — calendário Dia 01 a Dia 06 */}
        <section
          id="jornada-calendario-mentoria"
          className="py-20 sm:py-28 px-4 sm:px-6 scroll-mt-24 border-t border-white/10 bg-white/[0.03]"
        >
          <div className="max-w-4xl mx-auto">
            <motion.div
              className="text-center mb-8 sm:mb-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-sm uppercase tracking-widest text-[#4CCB7A]/90 mb-2">
                Calendário da mentoria
              </p>
              <h2
                className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"
                style={{ color: LIGHT }}
              >
                Sua jornada em 6 dias
              </h2>
              <p className="text-base sm:text-lg text-[#E8EDED]/75 leading-relaxed max-w-2xl mx-auto">
                Visual em formato de calendário: cada data é um dia de imersão. Toque no dia
                ou use Próximo para ver objetivo e conteúdo.
              </p>
            </motion.div>

            <div className="sm:hidden">
              <button
                type="button"
                onClick={() => setMobileJornadaModal('calendario')}
                className="w-full min-h-[52px] rounded-xl border border-[#4CCB7A]/40 bg-[#4CCB7A]/15 px-5 py-3.5 text-sm font-semibold text-[#4CCB7A]"
              >
                Abrir calendário da mentoria (Dia 01 a Dia 06)
              </button>
            </div>

            <div className="hidden sm:block">
            <div className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-[#0A1F44]/60 shadow-xl shadow-black/25 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-3 sm:px-5 sm:py-4">
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-[#E8EDED]/40"
                  disabled
                  aria-hidden
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                  <CalendarDays className="h-5 w-5 shrink-0 text-[#4CCB7A]" aria-hidden />
                  <div className="min-w-0 text-center">
                    <p className="truncate text-xs font-semibold uppercase tracking-wider text-[#4CCB7A]/90">
                      Imersão · 6 dias
                    </p>
                    <p className="truncate text-sm font-bold text-[#E8EDED] sm:text-base">
                      Semana da imersão (visão calendário)
                    </p>
                  </div>
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

              <div className="grid grid-cols-7 border-b border-white/10 bg-white/5 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-[#E8EDED]/45 sm:text-xs">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                  <div key={d} className="border-r border-white/5 py-2 last:border-r-0">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0 border-b border-white/10 bg-white/[0.04] p-2 sm:p-3">
                {cronogramaMentoria.map((d, i) => {
                  const sel = i === diaMentoriaIndex;
                  const num = String(i + 1).padStart(2, '0');
                  return (
                    <button
                      key={d.dia}
                      type="button"
                      onClick={() => goDiaMentoria(i)}
                      className={`flex min-h-[72px] flex-col items-center justify-center border-r border-white/5 p-2 text-center transition-all sm:min-h-[88px] ${
                        sel
                          ? 'bg-[#4CCB7A]/15 ring-1 ring-inset ring-[#4CCB7A]/50'
                          : 'hover:bg-white/5'
                      }`}
                      aria-label={`${d.dia} — ${d.titulo}`}
                      aria-current={sel ? 'date' : undefined}
                    >
                      <span className="text-[0.65rem] font-medium uppercase text-[#E8EDED]/45">
                        {DIAS_SEMANA_MENTORIA[i]}
                      </span>
                      <span
                        className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${
                          sel ? 'text-[#4CCB7A]' : 'text-[#E8EDED]'
                        }`}
                      >
                        {num}
                      </span>
                      <span className="mt-1 line-clamp-2 max-w-full px-0.5 text-[0.65rem] font-medium leading-tight text-[#E8EDED]/65 sm:text-xs">
                        {d.titulo}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-[#E8EDED]/70">
              <span>
                Dia{' '}
                <span className="font-semibold text-[#4CCB7A]">{diaMentoriaIndex + 1}</span>
                {' / '}
                {cronogramaMentoria.length}
              </span>
              <span className="text-[#E8EDED]/60">{diaMentoriaAtual.dia}</span>
            </div>

            <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#2F8FA3] to-[#4CCB7A]"
                initial={false}
                animate={{
                  width: `${((diaMentoriaIndex + 1) / cronogramaMentoria.length) * 100}%`,
                }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
              <button
                type="button"
                aria-label="Dia anterior"
                disabled={diaMentoriaIndex === 0}
                onClick={() => goDiaMentoria(diaMentoriaIndex - 1)}
                className="order-2 hidden min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-[#4CCB7A] transition-colors hover:border-[#4CCB7A]/35 sm:order-none sm:flex sm:h-auto sm:w-12 sm:min-h-0 sm:flex-col sm:px-0"
              >
                <ChevronLeft className="h-6 w-6 sm:mx-auto" />
                <span className="sm:sr-only">Dia anterior</span>
              </button>

              <div className="order-1 min-h-[min(22rem,58svh)] flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-black/20 sm:order-none sm:min-h-[280px]">
                <AnimatePresence initial={false} custom={diaMentoriaDir} mode="wait">
                  <motion.div
                    key={diaMentoriaIndex}
                    custom={diaMentoriaDir}
                    variants={carrosselSlideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full p-5 sm:p-8"
                  >
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#4CCB7A]/30 bg-[#4CCB7A]/10">
                        <span className="text-lg font-bold tabular-nums text-[#4CCB7A]">
                          {String(diaMentoriaIndex + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#4CCB7A]">
                          {diaMentoriaAtual.dia}
                        </p>
                        <p className="text-lg sm:text-xl font-bold text-[#E8EDED]">
                          {diaMentoriaAtual.titulo}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-[#4CCB7A] mb-2">Objetivo</p>
                    <p className="text-sm sm:text-base text-[#E8EDED]/90 leading-relaxed mb-5">
                      {diaMentoriaAtual.objetivo}
                    </p>
                    <p className="text-sm font-semibold text-[#4CCB7A] mb-2">Conteúdo do dia</p>
                    <ul className="max-h-[38vh] space-y-2 overflow-y-auto pr-1 sm:max-h-none">
                      {diaMentoriaAtual.detalhes.map((linha) => (
                        <li
                          key={linha}
                          className="flex gap-3 text-sm sm:text-base text-[#E8EDED]/90"
                        >
                          <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#4CCB7A]" />
                          <span>{linha}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </AnimatePresence>
              </div>

              <button
                type="button"
                aria-label="Próximo dia"
                disabled={diaMentoriaIndex >= cronogramaMentoria.length - 1}
                onClick={() => goDiaMentoria(diaMentoriaIndex + 1)}
                className="order-3 hidden min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-[#4CCB7A]/40 bg-gradient-to-r from-[#4CCB7A]/20 to-[#2F8FA3]/15 text-sm font-semibold text-[#4CCB7A] transition-all hover:border-[#4CCB7A]/60 hover:from-[#4CCB7A]/30 sm:flex sm:h-auto sm:w-12 sm:flex-col sm:px-0 sm:py-4"
              >
                <ChevronRight className="h-6 w-6 sm:mx-auto" />
                <span className="sm:sr-only">Próximo dia</span>
              </button>
            </div>

            </div>
          </div>
        </section>

        {/* INVESTIMENTO */}
        <section
          id="investimento"
          className="py-20 sm:py-28 px-4 sm:px-6 scroll-mt-24 border-t border-white/10 bg-white/[0.03]"
        >
          <div className="max-w-4xl mx-auto">
            <motion.div
              className="text-center mb-8 sm:mb-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-sm uppercase tracking-widest text-[#4CCB7A]/90 mb-2">
                Investimento
              </p>
              <h2
                className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"
                style={{ color: LIGHT }}
              >
                Valor e estrutura inicial
              </h2>
              <p className="text-base sm:text-lg text-[#E8EDED]/75 leading-relaxed max-w-2xl mx-auto">
                Condições claras, material incluso e referência de retorno no modelo — no
                mesmo painel visual da jornada em calendário.
              </p>
            </motion.div>

            <motion.div
              className="overflow-hidden rounded-2xl border border-white/10 bg-[#0A1F44]/60 shadow-xl shadow-black/25 backdrop-blur-sm"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#4CCB7A]/30 bg-[#4CCB7A]/10">
                    <Wallet className="h-5 w-5 text-[#4CCB7A]" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#4CCB7A]/90">
                      Programa mentoria
                    </p>
                    <p className="truncate text-sm font-bold text-[#E8EDED] sm:text-base">
                      Investimento e inclusões
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 border-b border-white/10 bg-white/[0.04] p-4 sm:grid-cols-2 sm:gap-4 sm:p-5">
                <div className="flex flex-col justify-center rounded-xl border border-white/10 bg-white/5 p-6 text-center sm:text-left">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#E8EDED]/50">
                    Parcelado
                  </p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-[#E8EDED] sm:text-4xl md:text-5xl">
                    R$ 10.000
                  </p>
                  <p className="mt-2 text-sm text-[#E8EDED]/65">10 × R$ 1.000</p>
                </div>
                <div className="relative flex flex-col justify-center overflow-hidden rounded-xl border border-[#4CCB7A]/40 bg-gradient-to-br from-[#4CCB7A]/12 via-[#4CCB7A]/5 to-[#2F8FA3]/10 p-6 text-center ring-1 ring-inset ring-[#4CCB7A]/25 sm:text-left">
                  <span className="absolute right-3 top-3 rounded-full bg-[#4CCB7A]/25 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#4CCB7A]">
                    À vista
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#4CCB7A]/90">
                    Melhor condição
                  </p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-[#4CCB7A] sm:text-4xl md:text-5xl">
                    R$ 7.000
                  </p>
                  <p className="mt-2 text-sm text-[#E8EDED]/75">
                    Pagamento único no valor do programa
                  </p>
                </div>
              </div>

              <div className="space-y-3 p-4 sm:p-6">
                <div className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#4CCB7A]/30 bg-[#4CCB7A]/10">
                    <Package className="h-5 w-5 text-[#4CCB7A]" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#4CCB7A] mb-2">
                      Estrutura entregue
                    </p>
                    <p className="text-sm sm:text-base leading-relaxed text-[#E8EDED]/90">
                      Você inicia com estrutura operacional para colocar o acompanhamento em
                      prática sobre a Oftware:{' '}
                      <span className="font-medium text-[#E8EDED]">
                        acesso à plataforma White Label
                      </span>
                      ,{' '}
                      <span className="font-medium text-[#E8EDED]">
                        kits de implantação do programa
                      </span>{' '}
                      e materiais alinhados ao fluxo comercial e clínico trabalhados na mentoria.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#4CCB7A]/30 bg-[#4CCB7A]/10">
                    <TrendingUp className="h-5 w-5 text-[#4CCB7A]" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#4CCB7A] mb-2">
                      Lógica de retorno
                    </p>
                    <p className="text-sm sm:text-base leading-relaxed text-[#E8EDED]/90">
                      Dentro do modelo ensinado e quando aplicado corretamente, essa
                      estrutura inicial já permite{' '}
                      <span className="font-medium text-[#4CCB7A]">
                        potencial de gerar receita relevante
                      </span>{' '}
                      frente ao valor do programa — sempre no contexto de consulta,
                      acompanhamento e execução do seu próprio modelo de atendimento.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#4CCB7A]/30 bg-[#4CCB7A]/10">
                    <BarChart3 className="h-5 w-5 text-[#4CCB7A]" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#4CCB7A] mb-2">
                      Comparação inteligente
                    </p>
                    <p className="mb-3 text-sm sm:text-base leading-relaxed text-[#E8EDED]/90">
                      Em cenário favorável de demanda e adesão, o mesmo material pode
                      representar proporções diferentes do investimento, conforme a forma
                      de pagamento:
                    </p>
                    <ul className="space-y-2.5 text-sm sm:text-base text-[#E8EDED]/90">
                      <li className="flex gap-3">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#4CCB7A]" />
                        <span>
                          <span className="font-medium text-[#E8EDED]">Parcelado</span>{' '}
                          (R$ 10.000): potencial de até cerca de{' '}
                          <span className="font-semibold text-[#4CCB7A]">~70%</span> do
                          valor da mentoria, quando o fluxo se alinha ao que foi
                          estruturado.
                        </span>
                      </li>
                      <li className="flex gap-3">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#4CCB7A]" />
                        <span>
                          <span className="font-medium text-[#E8EDED]">À vista</span>{' '}
                          (R$ 7.000): a mesma lógica pode chegar a um potencial de até{' '}
                          <span className="font-semibold text-[#4CCB7A]">100%</span> em
                          relação ao investimento — sem prometer resultado mínimo; depende
                          de execução, ticket e continuidade do acompanhamento.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 bg-black/15 px-4 py-5 sm:px-6 sm:py-6">
                <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-[#4CCB7A] sm:text-left">
                  Resumo financeiro (modelo)
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {[
                    { label: 'Parcelado', value: 'R$ 10.000', accent: false },
                    { label: 'À vista', value: 'R$ 7.000', accent: true },
                    { label: 'Material', value: '90 mg + 4 kits', accent: false },
                    { label: 'Retorno parcelado', value: '~70%', accent: false },
                    { label: 'Retorno à vista', value: 'até 100%', accent: false },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className={`rounded-xl border px-3 py-3 text-center sm:px-4 sm:py-3.5 ${
                        row.accent
                          ? 'border-[#4CCB7A]/40 bg-[#4CCB7A]/10'
                          : 'border-white/10 bg-white/[0.06]'
                      }`}
                    >
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#E8EDED]/50 sm:text-xs">
                        {row.label}
                      </p>
                      <p
                        className={`mt-1.5 break-words text-sm font-bold tabular-nums sm:text-base ${
                          row.accent ? 'text-[#4CCB7A]' : 'text-[#E8EDED]'
                        }`}
                      >
                        {row.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/10 p-4 sm:p-6">
                <button
                  type="button"
                  onClick={leadModal.open}
                  className={`${ctaButtonClass} w-full justify-center text-lg py-5`}
                >
                  Quero entrar no modelo digital
                  <ArrowRight size={22} />
                </button>
                <p className="mt-4 text-center text-xs text-[#E8EDED]/50">
                  Resultados dependem da execução.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-20 sm:py-28 px-4 sm:px-6 pb-32 sm:pb-28">
          <div className="max-w-4xl mx-auto text-center">
            <motion.h2
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-8 leading-tight"
              style={{ color: LIGHT }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              Ou você entra no digital…
              <br />
              <span className="text-[#4CCB7A]">ou continua limitado ao modelo tradicional.</span>
            </motion.h2>
            <motion.button
              type="button"
              onClick={leadModal.open}
              className={`${ctaButtonClass} text-lg sm:text-xl px-12 py-5 inline-flex`}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              Quero entrar no modelo digital
              <ArrowRight size={22} />
            </motion.button>
            <p className="text-[#E8EDED]/60 text-sm mt-4">
              Vagas limitadas. Não abrimos toda hora.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-8 px-4">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <Link href="/" className="flex items-center">
              <img
                src="/oftware-site-novo2.png"
                alt="Oftware"
                className="h-8 w-auto object-contain opacity-90"
              />
            </Link>
            <p className="text-[#E8EDED]/50 text-sm text-center sm:text-right">
              © {new Date().getFullYear()} Oftware — Mentoria Médica.
              <span className="block sm:inline sm:ml-1">
                Infraestrutura White Label para acompanhamento multidisciplinar.
              </span>
            </p>
          </div>
        </footer>
      </main>

      {/* Modais mobile — jornadas em tela cheia */}
      <AnimatePresence>
        {mobileJornadaModal === 'conteudo' && (
          <motion.div
            className="fixed inset-0 z-[70] bg-[#071633] sm:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#4CCB7A]/90">Jornada de conteúdo</p>
                  <p className="text-sm font-semibold text-[#E8EDED]">Etapas 1 a 10</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileJornadaModal(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#E8EDED]"
                  aria-label="Fechar modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="mb-4 flex items-center justify-between text-sm text-[#E8EDED]/70">
                  <span>
                    Etapa <span className="font-semibold text-[#4CCB7A]">{etapaMonetizarIndex + 1}</span> / {ETAPAS_MONETIZAR.length}
                  </span>
                  <span className="text-[#E8EDED]/60">Modelo digital</span>
                </div>

                <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#4CCB7A] to-[#2F8FA3]"
                    initial={false}
                    animate={{
                      width: `${((etapaMonetizarIndex + 1) / ETAPAS_MONETIZAR.length) * 100}%`,
                    }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>

                <div className="mb-4 -mx-1 flex gap-1 overflow-x-auto pb-1 snap-x snap-mandatory">
                  {ETAPAS_MONETIZAR.map((_, i) => (
                    <button
                      key={`modal-etapa-${i}`}
                      type="button"
                      onClick={() => goEtapaMonetizar(i)}
                      className={`snap-center shrink-0 min-h-[44px] min-w-[44px] rounded-xl border text-xs font-bold transition-all duration-200 ${
                        i === etapaMonetizarIndex
                          ? 'border-[#4CCB7A]/60 bg-[#4CCB7A]/20 text-[#4CCB7A]'
                          : 'border-white/10 bg-white/5 text-[#E8EDED]/80'
                      }`}
                      aria-label={`Ir para etapa ${i + 1}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <div className="min-h-[min(24rem,58svh)] overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
                  <AnimatePresence initial={false} custom={etapaMonetizarDir} mode="wait">
                    <motion.div
                      key={`modal-etapa-card-${etapaMonetizarIndex}`}
                      custom={etapaMonetizarDir}
                      variants={carrosselSlideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="mb-4 flex flex-wrap items-center gap-3">
                        <span className="rounded-lg border border-[#4CCB7A]/30 bg-[#4CCB7A]/10 px-2.5 py-1 text-xs font-bold text-[#4CCB7A]">
                          Etapa {String(etapaMonetizarIndex + 1).padStart(2, '0')}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#E8EDED]/50">
                          de {String(ETAPAS_MONETIZAR.length).padStart(2, '0')}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold leading-snug text-[#E8EDED] mb-4">
                        {etapaMonetizarAtual.titulo}
                      </h3>
                      <p className="text-sm text-[#E8EDED]/85 leading-relaxed mb-5">
                        {etapaMonetizarAtual.descricao}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#4CCB7A] mb-2">
                        Em foco
                      </p>
                      <ul className="space-y-2.5">
                        {etapaMonetizarAtual.pontos.map((p) => (
                          <li key={`modal-ponto-${p}`} className="flex gap-3 text-sm text-[#E8EDED]/90">
                            <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#4CCB7A]" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-white/10 px-4 py-3">
                <button
                  type="button"
                  disabled={etapaMonetizarIndex === 0}
                  onClick={() => goEtapaMonetizar(etapaMonetizarIndex - 1)}
                  className="min-h-[48px] rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-[#E8EDED] disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={etapaMonetizarIndex >= ETAPAS_MONETIZAR.length - 1}
                  onClick={() => goEtapaMonetizar(etapaMonetizarIndex + 1)}
                  className="min-h-[48px] rounded-xl border border-[#4CCB7A]/40 bg-[#4CCB7A]/15 text-sm font-semibold text-[#4CCB7A] disabled:opacity-40"
                >
                  Próximo
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileJornadaModal === 'calendario' && (
          <motion.div
            className="fixed inset-0 z-[70] bg-[#071633] sm:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#4CCB7A]/90">Calendário da mentoria</p>
                  <p className="text-sm font-semibold text-[#E8EDED]">Dia 01 ao Dia 06</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileJornadaModal(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#E8EDED]"
                  aria-label="Fechar modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-[#0A1F44]/60">
                  <div className="grid grid-cols-7 border-b border-white/10 bg-white/5 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-[#E8EDED]/45">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                      <div key={`modal-dia-${d}`} className="border-r border-white/5 py-2 last:border-r-0">
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-0 p-2">
                    {cronogramaMentoria.map((d, i) => {
                      const sel = i === diaMentoriaIndex;
                      return (
                        <button
                          key={`modal-cal-${d.dia}`}
                          type="button"
                          onClick={() => goDiaMentoria(i)}
                          className={`flex min-h-[70px] flex-col items-center justify-center border-r border-white/5 p-1.5 text-center ${
                            sel ? 'bg-[#4CCB7A]/15 ring-1 ring-inset ring-[#4CCB7A]/50' : ''
                          }`}
                          aria-label={`${d.dia} — ${d.titulo}`}
                        >
                          <span className="text-[0.62rem] uppercase text-[#E8EDED]/45">{DIAS_SEMANA_MENTORIA[i]}</span>
                          <span className={`text-lg font-bold ${sel ? 'text-[#4CCB7A]' : 'text-[#E8EDED]'}`}>
                            {String(i + 1).padStart(2, '0')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-4 flex items-center justify-between text-sm text-[#E8EDED]/70">
                  <span>
                    Dia <span className="font-semibold text-[#4CCB7A]">{diaMentoriaIndex + 1}</span> / {cronogramaMentoria.length}
                  </span>
                  <span className="text-[#E8EDED]/60">{diaMentoriaAtual.dia}</span>
                </div>

                <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#2F8FA3] to-[#4CCB7A]"
                    initial={false}
                    animate={{
                      width: `${((diaMentoriaIndex + 1) / cronogramaMentoria.length) * 100}%`,
                    }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>

                <div className="min-h-[min(22rem,52svh)] overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
                  <AnimatePresence initial={false} custom={diaMentoriaDir} mode="wait">
                    <motion.div
                      key={`modal-dia-card-${diaMentoriaIndex}`}
                      custom={diaMentoriaDir}
                      variants={carrosselSlideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#4CCB7A]/30 bg-[#4CCB7A]/10">
                          <span className="text-lg font-bold text-[#4CCB7A]">{String(diaMentoriaIndex + 1).padStart(2, '0')}</span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-[#4CCB7A]">{diaMentoriaAtual.dia}</p>
                          <p className="text-lg font-bold text-[#E8EDED]">{diaMentoriaAtual.titulo}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-[#4CCB7A] mb-2">Objetivo</p>
                      <p className="text-sm text-[#E8EDED]/90 leading-relaxed mb-5">{diaMentoriaAtual.objetivo}</p>
                      <ul className="space-y-2.5">
                        {diaMentoriaAtual.detalhes.map((linha) => (
                          <li key={`modal-linha-${linha}`} className="flex gap-3 text-sm text-[#E8EDED]/90">
                            <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#4CCB7A]" />
                            <span>{linha}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-white/10 px-4 py-3">
                <button
                  type="button"
                  disabled={diaMentoriaIndex === 0}
                  onClick={() => goDiaMentoria(diaMentoriaIndex - 1)}
                  className="min-h-[48px] rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-[#E8EDED] disabled:opacity-40"
                >
                  Dia anterior
                </button>
                <button
                  type="button"
                  disabled={diaMentoriaIndex >= cronogramaMentoria.length - 1}
                  onClick={() => goDiaMentoria(diaMentoriaIndex + 1)}
                  className="min-h-[48px] rounded-xl border border-[#4CCB7A]/40 bg-[#4CCB7A]/15 text-sm font-semibold text-[#4CCB7A] disabled:opacity-40"
                >
                  Próximo dia
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MentoriaLeadModal isOpen={leadModal.isOpen} onClose={leadModal.close} />
    </div>
  );
}
