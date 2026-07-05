'use client';

import type { ReactNode } from 'react';
import {
  Activity,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  Pill,
  Sparkles,
  Stethoscope,
  Syringe,
  Target,
  TrendingUp,
} from 'lucide-react';
import type { ModalidadePlanoId } from '@/lib/planoTerapeutico/modalidadesPlano';
import { PLANO_PERSONALIZADO_CARD } from '@/lib/treatment-negotiation/constants';

export type InclusoesPlanoUi = {
  consultas: number;
  aplicacoes: number;
  bioimpedancias: number;
  exames: number | null;
  doseTotalMg: number;
};

type CardDef = {
  id: ModalidadePlanoId;
  titulo: string;
  subtitulo: string;
  descricao?: string;
  destaque?: 'mais_escolhido' | 'recomendado' | 'personalizado';
  icon: typeof CalendarDays;
};

type TemaModalidade = {
  accent: string;
  accentRgb: string;
  gradient: string;
  gradientSoft: string;
  glow: string;
  borderIdle: string;
  borderActive: string;
  text: string;
  textMuted: string;
  iconWrap: string;
  iconColor: string;
  seloMaisEscolhido: string;
  seloRecomendado: string;
  inclusaoBg: string;
  inclusaoBorder: string;
  gridLine: string;
};

const TEMAS: Record<ModalidadePlanoId, TemaModalidade> = {
  mensal: {
    accent: 'sky',
    accentRgb: '14 165 233',
    gradient: 'from-sky-500/20 via-cyan-400/10 to-transparent',
    gradientSoft: 'from-sky-50/90 via-white to-cyan-50/40',
    glow: 'shadow-[0_0_24px_-4px_rgba(14,165,233,0.45)]',
    borderIdle: 'border-sky-200/40',
    borderActive: 'border-sky-400/70',
    text: 'text-sky-900',
    textMuted: 'text-sky-700/85',
    iconWrap: 'bg-sky-500/10 border-sky-200/60',
    iconColor: 'text-sky-600',
    seloMaisEscolhido: 'bg-gradient-to-r from-sky-600 to-cyan-500 text-white',
    seloRecomendado: 'bg-sky-700 text-white',
    inclusaoBg: 'bg-white/70 backdrop-blur-sm',
    inclusaoBorder: 'border-sky-100/90',
    gridLine: 'rgba(14, 165, 233, 0.06)',
  },
  trimestral: {
    accent: 'teal',
    accentRgb: '20 184 166',
    gradient: 'from-teal-500/25 via-emerald-400/10 to-transparent',
    gradientSoft: 'from-teal-50/90 via-white to-emerald-50/40',
    glow: 'shadow-[0_0_28px_-4px_rgba(20,184,166,0.5)]',
    borderIdle: 'border-teal-200/40',
    borderActive: 'border-teal-500/75',
    text: 'text-teal-900',
    textMuted: 'text-teal-700/85',
    iconWrap: 'bg-teal-500/10 border-teal-200/60',
    iconColor: 'text-teal-600',
    seloMaisEscolhido: 'bg-gradient-to-r from-teal-600 to-emerald-500 text-white',
    seloRecomendado: 'bg-teal-700 text-white',
    inclusaoBg: 'bg-white/70 backdrop-blur-sm',
    inclusaoBorder: 'border-teal-100/90',
    gridLine: 'rgba(20, 184, 166, 0.07)',
  },
  semestral: {
    accent: 'violet',
    accentRgb: '139 92 246',
    gradient: 'from-violet-500/25 via-purple-400/10 to-transparent',
    gradientSoft: 'from-violet-50/90 via-white to-purple-50/40',
    glow: 'shadow-[0_0_28px_-4px_rgba(139,92,246,0.45)]',
    borderIdle: 'border-violet-200/40',
    borderActive: 'border-violet-500/75',
    text: 'text-violet-900',
    textMuted: 'text-violet-700/85',
    iconWrap: 'bg-violet-500/10 border-violet-200/60',
    iconColor: 'text-violet-600',
    seloMaisEscolhido: 'bg-gradient-to-r from-violet-600 to-purple-500 text-white',
    seloRecomendado: 'bg-violet-700 text-white',
    inclusaoBg: 'bg-white/70 backdrop-blur-sm',
    inclusaoBorder: 'border-violet-100/90',
    gridLine: 'rgba(139, 92, 246, 0.07)',
  },
  personalizado: {
    accent: 'amber',
    accentRgb: '245 158 11',
    gradient: 'from-amber-500/30 via-orange-400/15 to-transparent',
    gradientSoft: 'from-amber-50/95 via-white to-orange-50/50',
    glow: 'shadow-[0_0_32px_-4px_rgba(245,158,11,0.55)]',
    borderIdle: 'border-amber-200/50',
    borderActive: 'border-amber-500/80',
    text: 'text-amber-950',
    textMuted: 'text-amber-800/90',
    iconWrap: 'bg-amber-500/15 border-amber-300/60',
    iconColor: 'text-amber-600',
    seloMaisEscolhido: 'bg-gradient-to-r from-amber-600 to-orange-500 text-white',
    seloRecomendado: 'bg-gradient-to-r from-amber-600 via-orange-500 to-amber-500 text-white',
    inclusaoBg: 'bg-white/75 backdrop-blur-sm',
    inclusaoBorder: 'border-amber-100/90',
    gridLine: 'rgba(245, 158, 11, 0.08)',
  },
};

const CARDS: CardDef[] = [
  {
    id: 'mensal',
    titulo: 'Mensal',
    subtitulo: 'Início do acompanhamento',
    icon: CalendarDays,
  },
  {
    id: 'trimestral',
    titulo: 'Trimestral',
    subtitulo: 'Evolução estruturada',
    destaque: 'mais_escolhido',
    icon: TrendingUp,
  },
  {
    id: 'semestral',
    titulo: 'Semestral',
    subtitulo: 'Ciclo terapêutico completo',
    destaque: 'recomendado',
    icon: Target,
  },
  {
    id: 'personalizado',
    titulo: PLANO_PERSONALIZADO_CARD.titulo,
    subtitulo: PLANO_PERSONALIZADO_CARD.subtitulo,
    descricao: PLANO_PERSONALIZADO_CARD.descricao,
    destaque: 'personalizado',
    icon: Sparkles,
  },
];

type Props = {
  modalidade: ModalidadePlanoId;
  onSelect: (id: ModalidadePlanoId) => void;
  inclusoes: InclusoesPlanoUi;
  children?: ReactNode;
};

function seloAba(
  destaque: CardDef['destaque'],
  tema: TemaModalidade
): { rotulo: string; className: string; shimmer?: boolean } | null {
  if (destaque === 'personalizado') {
    return {
      rotulo: PLANO_PERSONALIZADO_CARD.badge,
      className: `${tema.seloRecomendado} plano-modalidade-badge-shimmer shadow-sm`,
      shimmer: true,
    };
  }
  if (destaque === 'mais_escolhido') {
    return {
      rotulo: 'Mais escolhido',
      className: `${tema.seloMaisEscolhido} shadow-sm`,
    };
  }
  if (destaque === 'recomendado') {
    return {
      rotulo: 'Recomendado',
      className: tema.seloRecomendado,
    };
  }
  return null;
}

function formatarDoseTotalMg(mg: number): string {
  const n = Math.round(mg * 10) / 10;
  const texto = Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
  return `${texto} mg`;
}

function InclusoesGrid({
  inclusoes,
  tema,
}: {
  inclusoes: InclusoesPlanoUi;
  tema: TemaModalidade;
}) {
  const itens = [
    { icon: Stethoscope, titulo: 'Consultas', valor: `${inclusoes.consultas}` },
    { icon: Syringe, titulo: 'Aplicações', valor: `${inclusoes.aplicacoes}` },
    { icon: Activity, titulo: 'Bioimpedâncias', valor: `${inclusoes.bioimpedancias}` },
    {
      icon: FlaskConical,
      titulo: 'Análise de Exames',
      valor: inclusoes.exames != null && inclusoes.exames > 0 ? `${inclusoes.exames}` : '—',
    },
    { icon: ClipboardList, titulo: 'Monitoramento', valor: 'Contínuo' },
    {
      icon: Pill,
      titulo: 'Dose total',
      valor: formatarDoseTotalMg(inclusoes.doseTotalMg),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
      {itens.map(({ icon: Icon, titulo, valor }, i) => (
        <div
          key={titulo}
          className={`group flex items-center gap-2.5 sm:gap-3 rounded-xl border p-2.5 sm:p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${tema.inclusaoBg} ${tema.inclusaoBorder}`}
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <span
            className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg border shrink-0 transition-transform duration-300 group-hover:scale-105 ${tema.iconWrap} ${tema.iconColor}`}
          >
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-slate-500">{titulo}</p>
            <p className="text-sm font-semibold text-slate-900 tabular-nums">{valor}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TechGridBg({ cor }: { cor: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-100"
      aria-hidden
      style={{
        backgroundImage: `
          linear-gradient(${cor} 1px, transparent 1px),
          linear-gradient(90deg, ${cor} 1px, transparent 1px)
        `,
        backgroundSize: '28px 28px',
        maskImage: 'radial-gradient(ellipse 85% 70% at 50% 0%, black 20%, transparent 75%)',
      }}
    />
  );
}

export default function ModalidadeAcompanhamentoCards({
  modalidade,
  onSelect,
  inclusoes,
  children,
}: Props) {
  const ativo = CARDS.find((c) => c.id === modalidade) ?? CARDS[0];
  const temaAtivo = TEMAS[modalidade];
  const seloConteudo = seloAba(ativo.destaque, temaAtivo);
  const IconeAtivo = ativo.icon;

  return (
    <div className="space-y-4">
      <div className="relative">
        <div
          className="absolute -left-3 top-0 bottom-0 w-1 rounded-full bg-gradient-to-b from-teal-500 via-cyan-400 to-transparent opacity-80"
          aria-hidden
        />
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight pl-1">
          Escolha o formato do acompanhamento
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 pl-1">
          Selecione uma modalidade — os detalhes e investimento atualizam em tempo real.
        </p>
      </div>

      <div
        className="relative rounded-2xl border border-slate-200/80 bg-slate-900/[0.02] shadow-[0_8px_40px_-12px_rgba(15,23,42,0.15)] overflow-hidden"
        role="radiogroup"
        aria-label="Formato do acompanhamento"
      >
        {/* Faixa de abas — glass + tech */}
        <div className="relative border-b border-slate-200/70 bg-gradient-to-b from-slate-100/90 to-slate-50/50 backdrop-blur-md px-2 sm:px-3 pt-2.5 pb-0">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            aria-hidden
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 50%, rgba(20,184,166,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(139,92,246,0.1) 0%, transparent 45%)',
            }}
          />

          <div className="relative grid grid-cols-4 gap-1.5 sm:gap-2" role="presentation">
            {CARDS.map((card) => {
              const selecionado = modalidade === card.id;
              const tema = TEMAS[card.id];
              const selo = seloAba(card.destaque, tema);
              const Icone = card.icon;

              return (
                <button
                  key={card.id}
                  type="button"
                  role="radio"
                  aria-checked={selecionado}
                  onClick={() => onSelect(card.id)}
                  className={`group relative flex flex-col items-center justify-center min-h-[4.5rem] sm:min-h-[5rem] rounded-xl px-1 py-2.5 text-center transition-all duration-300 ease-out border ${
                    selecionado
                      ? `z-10 bg-white/95 backdrop-blur-xl ${tema.borderActive} ${tema.glow} scale-[1.02] -translate-y-0.5`
                      : `bg-white/40 backdrop-blur-sm ${tema.borderIdle} hover:bg-white/70 hover:border-slate-300/60 hover:-translate-y-px`
                  }`}
                >
                  {selecionado ? (
                    <span
                      className={`absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--tw-${tema.accent}-500))] to-transparent plano-modalidade-tab-glow opacity-0`}
                      style={{
                        background: `linear-gradient(90deg, transparent, rgb(${tema.accentRgb} / 0.9), transparent)`,
                      }}
                      aria-hidden
                    />
                  ) : null}

                  <span
                    className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg border mb-1.5 transition-all duration-300 ${
                      selecionado
                        ? `${tema.iconWrap} ${tema.iconColor} scale-110 shadow-sm`
                        : 'bg-slate-100/80 border-slate-200/80 text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    <Icone
                      className={`w-4 h-4 transition-transform duration-300 ${selecionado ? 'scale-105' : 'group-hover:scale-110'}`}
                      strokeWidth={selecionado ? 2 : 1.75}
                      aria-hidden
                    />
                  </span>

                  <span
                    className={`block w-full text-[10px] sm:text-xs font-bold leading-tight tracking-tight ${
                      selecionado ? tema.text : 'text-slate-600 group-hover:text-slate-800'
                    }`}
                  >
                    {card.titulo}
                  </span>

                  {selo ? (
                    <span
                      className={`mt-1.5 max-w-full rounded-full px-1.5 py-0.5 text-[6px] sm:text-[7px] font-bold uppercase tracking-wider leading-tight text-center truncate ${selo.className}`}
                    >
                      {selo.rotulo}
                    </span>
                  ) : (
                    <span className="mt-1.5 min-h-[14px]" aria-hidden />
                  )}

                  {selecionado ? (
                    <span
                      className="absolute bottom-0 left-3 right-3 h-[3px] rounded-full"
                      style={{
                        background: `linear-gradient(90deg, transparent, rgb(${tema.accentRgb}), transparent)`,
                        boxShadow: `0 0 12px rgb(${tema.accentRgb} / 0.6)`,
                      }}
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Painel de conteúdo */}
        <div
          key={modalidade}
          className={`relative overflow-hidden bg-gradient-to-br ${temaAtivo.gradientSoft} plano-modalidade-panel-enter`}
        >
          <TechGridBg cor={temaAtivo.gridLine} />

          <div
            className={`pointer-events-none absolute -top-24 -right-24 w-56 h-56 rounded-full blur-3xl bg-gradient-to-br ${temaAtivo.gradient}`}
            aria-hidden
          />

          <div className="relative p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm ${temaAtivo.iconWrap} ${temaAtivo.iconColor}`}
              >
                <IconeAtivo className="w-5 h-5" strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
                <div>
                  <p className={`text-lg font-bold tracking-tight ${temaAtivo.text}`}>
                    {ativo.titulo}
                  </p>
                  <p className={`text-sm mt-0.5 ${temaAtivo.textMuted}`}>{ativo.subtitulo}</p>
                </div>
                {seloConteudo ? (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${seloConteudo.className}`}
                  >
                    {seloConteudo.rotulo}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent"
                  aria-hidden
                />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Incluso no plano
                </p>
                <span
                  className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent"
                  aria-hidden
                />
              </div>
              <InclusoesGrid inclusoes={inclusoes} tema={temaAtivo} />
            </div>

            {ativo.descricao ? (
              <p className="mt-4 text-sm text-slate-600 leading-relaxed rounded-xl border border-slate-200/60 bg-white/50 backdrop-blur-sm px-3 py-2.5">
                {ativo.descricao}
              </p>
            ) : null}

            {children ? (
              <div className="mt-5 pt-5 border-t border-slate-200/60 space-y-5">{children}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
