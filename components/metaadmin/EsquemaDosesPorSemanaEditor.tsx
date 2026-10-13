'use client';

import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { Calendar, CalendarDays, CheckCircle, ChevronRight, RefreshCw, XCircle } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import { DoseMgTirzepatidaStepperField } from '@/components/tirzepatida/DoseMgTirzepatidaStepperField';
import { formatarDoseMgNumero } from '@/lib/tirzepatida/doseTitulacao';
import {
  buildSemanasEsquemaDoses,
  pacienteComDoseMgSemanaAtualizada,
  type SemanaEsquemaItem,
} from '@/utils/esquemaDosesSemana';
import { primeiraDoseDoPlano, semanaInicioCicloDoPlano } from '@/utils/datasAplicacaoSemanaPlano';
import { semanaRelativaNoProtocolo } from '@/utils/tirzepatidaProtocoloDisplay';
import {
  EsquemaDoseSemanaDateInput,
  formatDateAsDDMMYY,
  formatWeekdayPt,
} from '@/components/metaadmin/EsquemaDoseSemanaDateInput';

type Props = {
  paciente: PacienteCompleto;
  setPaciente: Dispatch<SetStateAction<PacienteCompleto | null>>;
  dataAplicacaoFocoRef: MutableRefObject<{ semana: number; valor: string } | null>;
  /** Somente visualização: doses/datas como texto; sem Resetar/Cancelar/Reativar. */
  readOnly?: boolean;
  /** Dentro de outro card: separador mais compacto. */
  embedded?: boolean;
};

type SemanaVisualKind = 'conclusao' | 'cancelada' | 'aplicada' | 'proxima' | 'pendente';

function getSemanaVisualState(
  item: SemanaEsquemaItem,
  proximaSemana: number | undefined
): SemanaVisualKind {
  if (item.isConclusao) return 'conclusao';
  if (item.isCancelada) return 'cancelada';
  if (item.temDoseAplicada) return 'aplicada';
  if (proximaSemana != null && item.semana === proximaSemana) return 'proxima';
  return 'pendente';
}

const SEMANA_CARD_CLASS: Record<SemanaVisualKind, string> = {
  conclusao: 'border-violet-200/70 bg-white dark:border-violet-800/40 dark:bg-violet-950/20',
  cancelada: 'border-red-200/80 bg-red-50/40 dark:border-red-900/50 dark:bg-red-950/20',
  aplicada: 'border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-900/30 dark:bg-emerald-950/20',
  proxima:
    'border-sky-300 bg-sky-50/50 ring-1 ring-sky-400/15 dark:border-sky-500/70 dark:bg-sky-950/30',
  pendente: 'border-gray-200/80 bg-white dark:border-gray-700 dark:bg-gray-900/40',
};

const DOSE_BOX_CLASS =
  'rounded-md border border-gray-200/80 bg-white px-2 py-1 text-center text-[13px] tabular-nums text-[color:var(--text-primary)] dark:border-gray-600 dark:bg-gray-900/70';

const DOSE_STEPPER_WRAP_CLASS =
  'rounded-md border border-gray-200/80 bg-white dark:border-gray-600 dark:bg-gray-900/70 [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-1 [&_button]:py-1 [&_button]:text-[13px] [&_button]:font-semibold [&_span]:font-semibold';

const DATE_BOX_CLASS = 'rounded-md bg-transparent';

const SCHEME_SHELL_CLASS =
  'rounded-2xl border border-gray-200/80 bg-[color:var(--surface-card)] px-4 py-4 md:p-5';

function DoseBoxReadOnly({ mg }: { mg: number }) {
  return (
    <div className={DOSE_BOX_CLASS}>
      <span className="font-semibold">{formatarDoseMgNumero(mg)}</span>
      <span className="ml-0.5 font-normal text-[color:var(--text-secondary)]">mg</span>
    </div>
  );
}

function SemanaBloqueioSwitch({
  blocked,
  disabled,
  onToggle,
}: {
  blocked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        role="switch"
        aria-checked={blocked}
        aria-label={blocked ? 'Desbloquear semana' : 'Bloquear semana'}
        disabled={disabled}
        onClick={onToggle}
        className={`relative h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors disabled:opacity-40 ${
          blocked ? 'bg-[color:var(--state-danger)]' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            blocked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      {blocked ? (
        <span className="text-[10px] font-medium leading-none text-[color:var(--state-danger)]">
          Bloqueado
        </span>
      ) : null}
    </div>
  );
}

function SemanaStatusFooter({ visual }: { visual: SemanaVisualKind }) {
  if (visual === 'aplicada') {
    return (
      <div className="flex items-center justify-center gap-1 pt-1 text-[11px] font-medium text-[color:var(--state-success)]">
        <CheckCircle className="h-3.5 w-3.5 shrink-0 text-[color:var(--state-success)]" aria-hidden />
        Aplicada
      </div>
    );
  }
  if (visual === 'pendente') {
    return (
      <div className="flex items-center justify-center gap-1 pt-1 text-[11px] font-medium text-[color:var(--text-secondary)]">
        <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Pendente
      </div>
    );
  }
  if (visual === 'cancelada') {
    return (
      <div className="flex items-center justify-center gap-1 pt-1 text-[11px] font-medium text-[color:var(--state-danger)]">
        <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Cancelada
      </div>
    );
  }
  if (visual === 'conclusao') {
    return (
      <div className="pt-1 text-center text-[11px] font-medium text-violet-700 dark:text-violet-300">
        Peso final
      </div>
    );
  }
  return null;
}

export function EsquemaDosesPorSemanaEditor({
  paciente,
  setPaciente,
  dataAplicacaoFocoRef,
  readOnly = false,
  embedded = false,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [carouselPage, setCarouselPage] = useState(0);
  const [carouselPages, setCarouselPages] = useState(1);
  const ptPlanoEsq = paciente?.planoTerapeutico;
  const primeiraDose = ptPlanoEsq ? primeiraDoseDoPlano(ptPlanoEsq) : null;

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const measure = () => {
      const cards = el.querySelectorAll<HTMLElement>('[data-semana-visual]');
      const total = cards.length;
      setCarouselPages(Math.max(1, total));
      if (total === 0) {
        setCarouselPage(0);
        return;
      }
      const origin = el.getBoundingClientRect().left;
      let best = 0;
      let bestDist = Infinity;
      cards.forEach((card, i) => {
        const dist = Math.abs(card.getBoundingClientRect().left - origin);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      setCarouselPage(best);
    };

    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      ro?.disconnect();
    };
  }, [paciente]);

  if (!primeiraDose) {
    return (
      <div className={`${embedded ? '' : 'mt-6'} ${SCHEME_SHELL_CLASS}`}>
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Configure a data de início para visualizar o esquema de doses.
        </p>
      </div>
    );
  }

  const built = buildSemanasEsquemaDoses(paciente);
  if (!built) {
    return (
      <div className={`${embedded ? '' : 'mt-6'} ${SCHEME_SHELL_CLASS}`}>
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Informe o número de semanas do tratamento para listar o esquema de doses.
        </p>
      </div>
    );
  }

  const { semanas } = built;
  const datasAplicacaoIndividuais = paciente.planoTerapeutico?.datasAplicacaoIndividuais || {};
  const inicioCiclo = semanaInicioCicloDoPlano(ptPlanoEsq);
  const semanasAtivas = semanas.filter((s) => !s.isConclusao && !s.isCancelada);
  const aplicadasCount = semanasAtivas.filter((s) => s.temDoseAplicada).length;
  const progressoPct =
    semanasAtivas.length > 0 ? Math.min(100, (aplicadasCount / semanasAtivas.length) * 100) : 0;
  const proximaSemana = semanas.find(
    (s) => !s.isConclusao && !s.isCancelada && !s.temDoseAplicada
  )?.semana;
  const temCancelada = semanas.some((s) => s.isCancelada);

  return (
    <div className={`min-w-0 ${embedded ? 'mt-4 md:mt-5' : 'mt-6'} ${SCHEME_SHELL_CLASS}`}>
      <div className="mb-2.5 flex flex-col gap-1 md:mb-3 md:flex-row md:items-start md:justify-between md:gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[color:var(--brand-primary)] dark:bg-emerald-950/40">
            <CalendarDays className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h5 className="text-[15px] font-bold leading-tight text-[color:var(--text-primary)] md:text-[17px]">
              Esquema de Doses por Semana
            </h5>
            <p className="hidden text-[13px] leading-snug text-[color:var(--text-secondary)] md:block">
              Visualize e ajuste cada aplicação do tratamento.
            </p>
          </div>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              setPaciente({
                ...paciente,
                planoTerapeutico: {
                  ...paciente.planoTerapeutico,
                  esquemaDosesCustomizado: undefined,
                },
              });
            }}
            className="inline-flex shrink-0 items-center gap-1 self-start text-[11px] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] md:text-[12px]"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Resetar para Automático
          </button>
        )}
      </div>

      <div className="relative min-w-0">
        <div
          ref={scrollerRef}
          className="overflow-x-auto overscroll-x-contain touch-pan-x max-md:snap-x max-md:snap-mandatory max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden [scrollbar-width:thin] [scrollbar-color:#c5cad3_transparent] md:[&::-webkit-scrollbar]:h-[3px] md:[&::-webkit-scrollbar-thumb]:rounded-full md:[&::-webkit-scrollbar-thumb]:bg-gray-300/70 md:[&::-webkit-scrollbar-track]:bg-transparent"
        >
          <div className="flex w-max gap-1.5 pb-1.5 pr-7 md:gap-2 md:pr-8">
            {semanas.map((item) => {
              const isEditable = !readOnly && !item.temDoseAplicada && !item.isConclusao;
              const semanaExibicao = semanaRelativaNoProtocolo(item.semana, inicioCiclo);
              const visual = getSemanaVisualState(item, proximaSemana);
              const cardWidth =
                visual === 'proxima'
                  ? 'w-[110px] min-w-[110px] flex-[0_0_110px] md:w-[114px] md:min-w-[114px] md:flex-[0_0_114px]'
                  : 'w-[100px] min-w-[100px] flex-[0_0_100px] md:w-[114px] md:min-w-[114px] md:flex-[0_0_114px]';
              return (
                <div
                  key={item.semana}
                  data-semana-visual={visual}
                  title={
                    item.doseCustomizada != null && !item.isCancelada && !item.isConclusao
                      ? 'Dose ajustada manualmente'
                      : undefined
                  }
                  className={`flex min-h-[175px] shrink-0 snap-start flex-col items-center rounded-[10px] border px-1.5 py-2 text-center md:px-2 ${cardWidth} ${SEMANA_CARD_CLASS[visual]}`}
                >
                  <div className="relative w-full">
                    <div className="text-[12px] font-semibold leading-none text-[color:var(--text-primary)] md:text-[13px]">
                      {item.isConclusao ? 'Conclusão' : `Sem ${semanaExibicao}`}
                    </div>
                  </div>

                  {!(isEditable && !item.isCancelada) ? (
                    <div className="mt-1 w-full leading-tight">
                      <div className="text-[11px] tabular-nums text-[color:var(--text-secondary)]">
                        {formatDateAsDDMMYY(item.dataExibicao)}
                      </div>
                      <div className="text-[11px] text-[color:var(--text-secondary)]">
                        {formatWeekdayPt(item.dataExibicao)}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 w-full text-[11px] leading-tight text-[color:var(--text-secondary)]">
                      {formatWeekdayPt(item.dataExibicao)}
                    </div>
                  )}

                  <div className="mt-2 flex w-full flex-col items-center gap-1.5">
                    {item.isConclusao ? (
                      <SemanaStatusFooter visual="conclusao" />
                    ) : item.isCancelada ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <SemanaBloqueioSwitch
                          blocked
                          disabled={readOnly}
                          onToggle={() => {
                            const semanasCanceladasAtual =
                              paciente.planoTerapeutico?.semanasCanceladas || [];
                            const novasCanceladas = semanasCanceladasAtual.filter(
                              (s) => s !== item.semana
                            );
                            setPaciente({
                              ...paciente,
                              planoTerapeutico: {
                                ...paciente.planoTerapeutico,
                                semanasCanceladas:
                                  novasCanceladas.length > 0 ? novasCanceladas : undefined,
                              },
                            });
                          }}
                        />
                      </div>
                    ) : isEditable ? (
                      <div className="flex w-full flex-col items-center gap-1.5">
                        <div className={`w-full ${DOSE_STEPPER_WRAP_CLASS}`}>
                          <DoseMgTirzepatidaStepperField
                            variant="compact"
                            value={item.doseAtual}
                            onChange={(novaDose) => {
                              setPaciente(
                                pacienteComDoseMgSemanaAtualizada(paciente, item.semana, novaDose)
                              );
                            }}
                            ariaLabel={`Alterar dose da semana ${semanaExibicao}`}
                          />
                        </div>
                        <div className={`w-full ${DATE_BOX_CLASS}`}>
                          <EsquemaDoseSemanaDateInput
                            appearance="timeline"
                            semana={item.semana}
                            dataExibicao={item.dataExibicao}
                            yyyyMmDdFromMap={datasAplicacaoIndividuais[item.semana]}
                            dataAplicacaoFocoRef={dataAplicacaoFocoRef}
                            onApplyYyyyMmDd={(semana, ymd) => {
                              const datasAtual =
                                paciente.planoTerapeutico?.datasAplicacaoIndividuais || {};
                              setPaciente({
                                ...paciente,
                                planoTerapeutico: {
                                  ...paciente.planoTerapeutico,
                                  datasAplicacaoIndividuais: { ...datasAtual, [semana]: ymd },
                                },
                              });
                            }}
                            onRemoveOverride={(semana) => {
                              const datasAtual =
                                paciente.planoTerapeutico?.datasAplicacaoIndividuais || {};
                              const novoDatas = { ...datasAtual };
                              delete novoDatas[semana];
                              setPaciente({
                                ...paciente,
                                planoTerapeutico: {
                                  ...paciente.planoTerapeutico,
                                  datasAplicacaoIndividuais:
                                    Object.keys(novoDatas).length > 0 ? novoDatas : undefined,
                                },
                              });
                            }}
                          />
                        </div>
                        {visual !== 'proxima' && <SemanaStatusFooter visual="pendente" />}
                        <SemanaBloqueioSwitch
                          blocked={false}
                          onToggle={() => {
                            const semanasCanceladasAtual =
                              paciente.planoTerapeutico?.semanasCanceladas || [];
                            setPaciente({
                              ...paciente,
                              planoTerapeutico: {
                                ...paciente.planoTerapeutico,
                                semanasCanceladas: [...semanasCanceladasAtual, item.semana],
                              },
                            });
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex w-full flex-col items-center gap-1.5">
                        <div className="w-full">
                          <DoseBoxReadOnly mg={item.doseAtual} />
                        </div>
                        <SemanaStatusFooter visual={visual} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-1.5 right-0 top-0 w-8 bg-gradient-to-l from-[color:var(--surface-card)] to-transparent"
        />
        <button
          type="button"
          aria-label="Ver próximas semanas"
          onClick={() => {
            scrollerRef.current?.scrollBy({ left: 240, behavior: 'smooth' });
          }}
          className="absolute right-0 top-1/2 z-[1] hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200/80 bg-white text-[color:var(--text-secondary)] shadow-sm hover:text-[color:var(--text-primary)] md:inline-flex"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {carouselPages > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 md:hidden" role="tablist" aria-label="Posição do esquema semanal">
          {Array.from({ length: carouselPages }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ir para a semana ${i + 1}`}
              aria-current={i === carouselPage ? 'true' : undefined}
              onClick={() => {
                const el = scrollerRef.current;
                if (!el) return;
                const cards = el.querySelectorAll<HTMLElement>('[data-semana-visual]');
                const target = cards[i];
                if (!target) return;
                el.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
              }}
              className={
                i === carouselPage
                  ? 'h-2 w-2 rounded-full bg-[color:var(--brand-primary)]'
                  : 'h-1.5 w-1.5 rounded-full bg-gray-300'
              }
            />
          ))}
        </div>
      )}

      {semanasAtivas.length > 0 && (
        <div className="mt-3 min-w-0">
          <div
            className="relative h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
            title={`${aplicadasCount} de ${semanasAtivas.length} aplicações`}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[color:var(--state-success)]"
              style={{ width: `${progressoPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[12px] text-[color:var(--text-secondary)]">
            <span className="font-medium text-[color:var(--text-primary)]">Progresso do tratamento</span>
            <span className="mx-1.5 text-gray-300" aria-hidden>
              •
            </span>
            <span className="tabular-nums">
              {aplicadasCount} de {semanasAtivas.length} aplicações realizadas
            </span>
          </p>
        </div>
      )}

      {temCancelada && (
        <p className="mt-3 text-[11px] text-[color:var(--text-secondary)]">
          Semanas canceladas não entram no total de miligramas
          {readOnly
            ? '.'
            : '. Ao salvar o paciente, essas semanas serão registradas como puladas na evolução.'}
        </p>
      )}
    </div>
  );
}
