'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Syringe,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import {
  RECOMENDACOES_TOPIC_LABELS,
  RECOMENDACOES_TOPICS_TOTAL,
} from '@/lib/meta/recomendacaoConsentConstants';

const LAST_SLIDE_INDEX = RECOMENDACOES_TOPICS_TOTAL - 1;

export type ModalRecomendacoesPacienteProps = {
  variant?: 'portal' | 'embedded';
  open?: boolean;
  onClose: () => void;
  obrigatorias?: boolean;
  /** Somente na 3ª etapa (Aplicação), ao clicar em "Estou ciente e continuar". */
  onConcluirLeitura?: () => void | Promise<void>;
  className?: string;
};

type CardRow = {
  mark: string;
  tone: 'ok' | 'no' | 'warn' | 'info';
  text: string;
};

function RecomendacaoCard({ row }: { row: CardRow }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
          row.tone === 'ok'
            ? 'bg-[#4CCB7A]/20 text-[#4CCB7A]'
            : row.tone === 'no'
              ? 'bg-red-500/20 text-red-200'
              : row.tone === 'warn'
                ? 'bg-amber-400/20 text-amber-200'
                : 'bg-[#2F8FA3]/25 text-[#E8EDED]'
        }`}
      >
        {row.mark}
      </span>
      <p className="text-sm font-medium leading-relaxed text-[#E8EDED]/85">{row.text}</p>
    </div>
  );
}

function SlideAlimentacao() {
  return (
    <div className="space-y-5 pb-2">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3]">
          <UtensilsCrossed className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-lg font-bold text-[#E8EDED] sm:text-xl">Alimentação</h3>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-[#E8EDED]/75">
          A Tirzepatida é um medicamento que auxilia no controle do peso e da glicemia. Para obter os melhores
          resultados, é importante seguir cuidados específicos de alimentação e atividade física.
        </p>
      </div>
      <div className="space-y-2">
        {[
          { mark: '✓', tone: 'ok' as const, text: 'Priorize proteínas magras: ovos, frango, peixe, queijos leves, tofu.' },
          { mark: '✓', tone: 'ok', text: 'Aumente a ingestão de vegetais e fibras: folhas verdes, legumes, chia, aveia, feijão.' },
          { mark: '✓', tone: 'ok', text: 'Prefira carboidratos integrais e com baixo índice glicêmico.' },
          { mark: '✗', tone: 'no', text: 'Reduza açúcar, massas, pão branco e alimentos ultraprocessados.' },
          { mark: '💧', tone: 'info', text: 'Mantenha hidratação adequada: 2 a 3 litros de água por dia.' },
          { mark: '⚡', tone: 'info', text: 'Faça refeições menores, com intervalos um pouco maiores – isso ajuda a controlar possíveis náuseas.' },
          { mark: '✗', tone: 'no', text: 'Evite álcool, especialmente nas primeiras semanas, pois pode piorar sintomas gastrointestinais.' },
        ].map((row, i) => (
          <RecomendacaoCard key={i} row={row} />
        ))}
      </div>
    </div>
  );
}

function SlideExercicios() {
  return (
    <div className="space-y-5 pb-2">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3]">
          <Dumbbell className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-lg font-bold text-[#E8EDED] sm:text-xl">Exercícios Físicos</h3>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-[#E8EDED]/75">
          A prática regular de exercícios físicos é essencial para potencializar os resultados do tratamento com
          Tirzepatida.
        </p>
      </div>
      <div className="space-y-2">
        {[
          { mark: '✓', tone: 'ok' as const, text: 'Realize ao menos 150 minutos por semana de exercícios aeróbicos moderados: caminhada, bicicleta ou natação.' },
          { mark: '✓', tone: 'ok', text: 'Inclua 2 treinos de força semanais (peso corporal já é suficiente).' },
          { mark: '⚠', tone: 'warn', text: 'Evite exercícios muito intensos nas primeiras 2 semanas de uso ou após aumentos de dose.' },
          { mark: '💡', tone: 'info', text: 'Tente fazer uma caminhada leve após as refeições, pois ajuda no controle glicêmico.' },
          { mark: '⚡', tone: 'info', text: 'Caso tenha tonturas ou fraqueza, reduza a intensidade e hidrate-se bem.' },
          { mark: '💪', tone: 'info', text: 'Se estiver muito nauseado nesses dias, priorize exercícios leves ou alongamentos.' },
        ].map((row, i) => (
          <RecomendacaoCard key={i} row={row} />
        ))}
      </div>
      <div className="rounded-2xl border border-red-400/35 bg-red-500/10 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-300" />
          <div>
            <p className="mb-2 font-bold text-red-100">Importante</p>
            <ul className="space-y-1.5 text-sm text-red-100/90">
              <li>• Náuseas podem ocorrer; pequenas adaptações na dieta ajudam</li>
              <li>• Nunca aumente a dose por conta própria</li>
              <li>
                • Em caso de dor abdominal intensa, vômitos persistentes ou sinais de desidratação, procure atendimento
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideAplicacao() {
  return (
    <div className="space-y-5 pb-2">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3]">
          <Syringe className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-lg font-bold text-[#E8EDED] sm:text-xl">Aplicação</h3>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-[#E8EDED]/75">
          A medicação utilizada no tratamento foi prescrita pelo médico responsável após avaliação clínica individual.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[#E8EDED]/75">
          Para maior comodidade e continuidade do tratamento, o paciente pode optar pelo recebimento domiciliar da
          medicação preparada para aplicação, seguindo os protocolos definidos pela equipe médica.
        </p>
      </div>
      <div className="space-y-2">
        {[
          { mark: '✓', tone: 'ok' as const, text: 'Estou ciente das orientações sobre armazenamento e utilização da medicação.' },
          { mark: '✓', tone: 'ok', text: 'Entendo que o tratamento deve seguir exclusivamente a prescrição médica e o acompanhamento da equipe.' },
          { mark: '✓', tone: 'ok', text: 'Opto voluntariamente pelo recebimento domiciliar da medicação para continuidade do tratamento.' },
          { mark: '✓', tone: 'ok', text: 'Comprometo-me a informar qualquer efeito adverso ou intercorrência durante o uso.' },
        ].map((row, i) => (
          <RecomendacaoCard key={i} row={row} />
        ))}
      </div>
      <div className="rounded-2xl border border-amber-400/35 bg-amber-500/10 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/20 text-xs font-bold text-amber-200">
            ⚠️
          </span>
          <p className="text-sm font-medium leading-relaxed text-amber-100/90">
            A medicação deve ser armazenada conforme orientação recebida e mantida fora do alcance de crianças.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ModalRecomendacoesPaciente({
  variant = 'portal',
  open = true,
  onClose,
  obrigatorias = false,
  onConcluirLeitura,
  className = '',
}: ModalRecomendacoesPacienteProps) {
  const [slide, setSlide] = useState(0);
  const [maxSlideAlcancado, setMaxSlideAlcancado] = useState(0);
  const [concluindo, setConcluindo] = useState(false);

  const irParaSlide = (index: number) => {
    if (obrigatorias && index > maxSlideAlcancado) return;
    setSlide(index);
    setMaxSlideAlcancado((prev) => Math.max(prev, index));
  };

  const avancarSlide = (index: number) => {
    setSlide(index);
    setMaxSlideAlcancado((prev) => Math.max(prev, index));
  };

  if (variant === 'portal' && !open) return null;
  if (variant === 'portal' && typeof window === 'undefined') return null;

  const shellClass =
    variant === 'portal'
      ? 'fixed inset-0 z-[99997] flex flex-col bg-[#0A1F44] text-[#E8EDED] shadow-[inset_0_0_80px_rgba(76,203,122,0.06)]'
      : `flex flex-col min-h-0 h-full rounded-2xl border border-white/10 bg-[#0A1F44] text-[#E8EDED] overflow-hidden ${className}`;

  const tabClass = (active: boolean, borderRight?: boolean) =>
    `flex flex-col items-center justify-center gap-1 py-2.5 px-1 transition-all sm:flex-row sm:gap-2 sm:py-3 ${
      borderRight ? 'border-r border-white/10' : ''
    } ${active ? 'bg-[#4CCB7A]/12 text-[#4CCB7A]' : 'text-[#E8EDED]/65 hover:text-[#E8EDED]/90'}`;

  const handleConcluir = async () => {
    setConcluindo(true);
    try {
      await onConcluirLeitura?.();
      onClose();
    } catch (error) {
      console.error('Erro ao concluir leitura das recomendações:', error);
      alert('Não foi possível concluir. Tente novamente.');
    } finally {
      setConcluindo(false);
    }
  };

  const content = (
    <div
      className={shellClass}
      role="dialog"
      aria-modal={variant === 'portal'}
      aria-labelledby="meta-recomendacoes-titulo"
    >
      {variant === 'portal' && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-[#4CCB7A]/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-[#2F8FA3]/10 blur-3xl" />
        </div>
      )}

      <header
        className={`relative z-[1] flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 ${
          variant === 'portal' ? 'pt-[max(0.75rem,env(safe-area-inset-top))]' : ''
        }`}
      >
        <div className="min-w-0 flex-1">
          <h2 id="meta-recomendacoes-titulo" className="truncate text-lg font-bold text-[#E8EDED] sm:text-xl">
            Recomendações
          </h2>
          {obrigatorias && (
            <p className="mt-0.5 text-xs text-[#E8EDED]/65">
              Leia os três tópicos para continuar usando a plataforma.
            </p>
          )}
        </div>
        {!obrigatorias && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-[#E8EDED]/80 transition-colors hover:bg-white/10 hover:text-[#E8EDED]"
            aria-label="Fechar recomendações"
          >
            <X size={24} />
          </button>
        )}
      </header>

      <div
        className={`relative z-[1] flex min-h-0 flex-1 flex-col ${
          variant === 'portal' ? 'px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pt-4' : 'p-3'
        }`}
      >
        <div className="mx-auto flex min-h-0 w-full max-w-[1200px] flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0A1F44]/80 shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)]">
          <div className="grid shrink-0 grid-cols-3 border-b border-white/10 bg-white/5">
            <button
              type="button"
              onClick={() => irParaSlide(0)}
              disabled={obrigatorias && 0 > maxSlideAlcancado}
              className={`${tabClass(slide === 0, true)} disabled:cursor-not-allowed disabled:opacity-40`}
              aria-current={slide === 0 ? 'true' : undefined}
            >
              <UtensilsCrossed className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span className="text-[10px] font-semibold sm:text-sm leading-tight text-center">Alimentação</span>
            </button>
            <button
              type="button"
              onClick={() => irParaSlide(1)}
              disabled={obrigatorias && 1 > maxSlideAlcancado}
              className={`${tabClass(slide === 1, true)} disabled:cursor-not-allowed disabled:opacity-40`}
              aria-current={slide === 1 ? 'true' : undefined}
            >
              <Dumbbell className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span className="text-[10px] font-semibold sm:text-sm leading-tight text-center">Exercícios</span>
            </button>
            <button
              type="button"
              onClick={() => irParaSlide(2)}
              disabled={obrigatorias && 2 > maxSlideAlcancado}
              className={`${tabClass(slide === 2)} disabled:cursor-not-allowed disabled:opacity-40`}
              aria-current={slide === 2 ? 'true' : undefined}
            >
              <Syringe className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span className="text-[10px] font-semibold sm:text-sm leading-tight text-center">Aplicação</span>
            </button>
          </div>

          <div className="shrink-0 px-5 pt-4">
            <div className="mb-3 flex items-center justify-between text-xs text-[#E8EDED]/65">
              <span>
                Tópico <span className="font-semibold text-[#4CCB7A]">{slide + 1}</span> / {RECOMENDACOES_TOPICS_TOTAL}
              </span>
              <span className="text-[#E8EDED]/50">{RECOMENDACOES_TOPIC_LABELS[slide]}</span>
            </div>
            <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2F8FA3] to-[#4CCB7A] transition-all duration-300"
                style={{ width: `${((slide + 1) / RECOMENDACOES_TOPICS_TOTAL) * 100}%` }}
              />
            </div>
          </div>

          <div
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 ${
              variant === 'embedded' ? 'max-h-[min(52vh,520px)]' : ''
            }`}
          >
            {slide === 0 && <SlideAlimentacao />}
            {slide === 1 && <SlideExercicios />}
            {slide === 2 && <SlideAplicacao />}
          </div>

          {obrigatorias ? (
            <div className="shrink-0 border-t border-white/10 bg-white/5 p-4">
              {slide === 0 && (
                <button
                  type="button"
                  onClick={() => avancarSlide(1)}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#4CCB7A] text-sm font-semibold text-[#0A1F44] transition-colors hover:bg-[#45b86d]"
                >
                  Continuar para exercícios
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
              {slide === 1 && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => irParaSlide(0)}
                    className="min-h-[48px] rounded-xl border border-white/15 text-sm font-semibold text-[#E8EDED] transition-colors hover:bg-white/5"
                  >
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <ChevronLeft className="h-4 w-4" />
                      Voltar
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => avancarSlide(2)}
                    className="min-h-[48px] rounded-xl bg-[#4CCB7A] text-sm font-semibold text-[#0A1F44] transition-colors hover:bg-[#45b86d]"
                  >
                    <span className="inline-flex items-center justify-center gap-1.5">
                      Continuar
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </button>
                </div>
              )}
              {slide === LAST_SLIDE_INDEX && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => irParaSlide(1)}
                    className="min-h-[48px] rounded-xl border border-white/15 text-sm font-semibold text-[#E8EDED] transition-colors hover:bg-white/5"
                  >
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <ChevronLeft className="h-4 w-4" />
                      Voltar
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={concluindo || maxSlideAlcancado < LAST_SLIDE_INDEX}
                    onClick={() => void handleConcluir()}
                    className="min-h-[48px] rounded-xl bg-[#4CCB7A] px-2 text-sm font-semibold text-[#0A1F44] transition-colors hover:bg-[#45b86d] disabled:opacity-60"
                  >
                    {concluindo ? 'Salvando...' : 'Estou ciente e continuar'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-white/10 bg-white/5 p-4">
              <button
                type="button"
                onClick={() => setSlide((s) => Math.max(0, s - 1))}
                disabled={slide === 0}
                className="min-h-[44px] rounded-xl border border-white/15 text-sm font-semibold text-[#E8EDED] transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSlide((s) => Math.min(LAST_SLIDE_INDEX, s + 1))}
                disabled={slide === LAST_SLIDE_INDEX}
                className="min-h-[44px] rounded-xl border border-[#4CCB7A]/40 bg-[#4CCB7A]/10 text-sm font-semibold text-[#4CCB7A] transition-colors hover:bg-[#4CCB7A]/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (variant === 'embedded') return content;
  return createPortal(content, document.body);
}
