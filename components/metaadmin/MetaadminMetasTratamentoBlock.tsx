'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { PacienteCompleto } from '@/types/obesidade';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { META_STEP_CM, META_STEP_KG, roundMetaHalfStep } from '@/utils/metaadminMetasUiSteps';
import {
  resolveMetaPerdaPesoAtiva,
  resolveMetaReducaoCinturaAtiva,
  resolveMetasTratamentoModuloResumo,
} from '@/utils/metasTratamentoSwitches';

export type MetaadminMetasTratamentoBlockProps = {
  paciente: PacienteCompleto;
  setPaciente: Dispatch<SetStateAction<PacienteCompleto | null>>;
  /** Quando true, omite o texto introdutório sob o título da secção. */
  hideMetaHeading?: boolean;
  /** Título da secção (ex.: "5.3 Metas do Tratamento" no metaadmin desktop). */
  sectionHeading?: string;
};

export function MetaadminMetasTratamentoBlock({
  paciente,
  setPaciente,
  hideMetaHeading = false,
  sectionHeading = 'Metas do Tratamento',
}: MetaadminMetasTratamentoBlockProps) {
  const p = paciente;
  const mi = p.dadosClinicos?.medidasIniciais;
  const peso0 = mi?.peso;
  const cint0 = mi?.circunferenciaAbdominal;
  const m = p.planoTerapeutico?.metas;

  const pctMin = 5;
  const pctMax = 45;

  const kgMin =
    peso0 != null && peso0 > 0 ? roundMetaHalfStep((peso0 * pctMin) / 100) : 0;
  const kgMax =
    peso0 != null && peso0 > 0 ? roundMetaHalfStep((peso0 * pctMax) / 100) : 0;

  let kgPerda: number | null = null;
  if (peso0 != null && peso0 > 0) {
    let kgRaw: number;
    if (
      m?.weightLossTargetType === 'PESO_ABSOLUTO' &&
      m.weightLossTargetValue != null &&
      m.weightLossTargetValue > 0
    ) {
      kgRaw = m.weightLossTargetValue;
    } else if (
      m?.weightLossTargetType === 'PERCENTUAL' &&
      m.weightLossTargetValue != null &&
      m.weightLossTargetValue > 0
    ) {
      kgRaw = (peso0 * m.weightLossTargetValue) / 100;
    } else {
      kgRaw = (peso0 * 12) / 100;
    }
    kgPerda = roundMetaHalfStep(Math.min(kgMax, Math.max(kgMin, kgRaw)));
  }

  const pctLoss =
    peso0 != null && peso0 > 0 && kgPerda != null
      ? Math.round(((kgPerda / peso0) * 100) * 10) / 10
      : 12;

  const maxWaistLossRaw =
    cint0 != null && cint0 > 60
      ? Math.min(40, Math.round((cint0 - 55) * 10) / 10)
      : cint0 != null && cint0 > 0
        ? Math.min(30, Math.round(cint0 * 0.25 * 10) / 10)
        : 25;
  const maxWaistLoss = roundMetaHalfStep(maxWaistLossRaw);
  let waistLossCm =
    typeof m?.waistReductionTargetCm === 'number' && !Number.isNaN(m.waistReductionTargetCm)
      ? m.waistReductionTargetCm
      : 8;
  waistLossCm = roundMetaHalfStep(Math.min(maxWaistLoss, Math.max(0, waistLossCm)));

  const pesoMeta =
    peso0 != null && kgPerda != null ? Math.round((peso0 - kgPerda) * 10) / 10 : null;
  const cinturaMeta =
    cint0 != null ? Math.round((cint0 - waistLossCm) * 10) / 10 : null;

  const evolucao = p.evolucaoSeguimento || [];
  const seguimentoOrdem = [...evolucao].sort(
    (a, b) => (a.weekIndex ?? 0) - (b.weekIndex ?? 0)
  );
  const primeiroRegistro = seguimentoOrdem.find((e) => e.weekIndex === 1);
  const baselinePeso =
    primeiroRegistro?.peso != null && primeiroRegistro.peso > 0
      ? primeiroRegistro.peso
      : peso0 != null && peso0 > 0
        ? peso0
        : null;
  const ultimoComPeso = [...seguimentoOrdem]
    .reverse()
    .find((r) => r.peso != null && r.peso > 0);
  const pesoAtualVal = ultimoComPeso?.peso ?? null;
  const kgPerdido =
    baselinePeso != null && pesoAtualVal != null
      ? Math.round((baselinePeso - pesoAtualVal) * 10) / 10
      : null;
  const pctMetaPeso =
    kgPerda != null && kgPerda > 0
      ? kgPerdido == null
        ? null
        : Math.round((Math.max(0, kgPerdido) / kgPerda) * 1000) / 10
      : null;

  const baselineCint = cint0 != null && cint0 > 0 ? cint0 : null;
  const ultimoComp = [...seguimentoOrdem]
    .reverse()
    .find(
      (r) =>
        r.circunferenciaAbdominal != null && r.circunferenciaAbdominal > 0
    );
  const circAtualVal = ultimoComp?.circunferenciaAbdominal ?? null;
  const cmReduzido =
    baselineCint != null && circAtualVal != null
      ? Math.round((baselineCint - circAtualVal) * 10) / 10
      : null;
  const pctMetaCint =
    waistLossCm > 0
      ? cmReduzido == null
        ? null
        : Math.round((Math.max(0, cmReduzido) / waistLossCm) * 1000) / 10
      : null;

  const patchMetas = (partial: Record<string, unknown>) => {
    setPaciente({
      ...p,
      planoTerapeutico: {
        ...p.planoTerapeutico,
        metas: {
          ...p.planoTerapeutico?.metas,
          ...partial,
        },
      },
    });
  };

  const bumpKgPerda = (delta: number) => {
    if (peso0 == null || peso0 <= 0) return;
    const cur =
      kgPerda != null ? kgPerda : roundMetaHalfStep((peso0 * 12) / 100);
    const next = roundMetaHalfStep(Math.min(kgMax, Math.max(kgMin, cur + delta)));
    patchMetas({
      weightLossTargetType: 'PESO_ABSOLUTO',
      weightLossTargetValue: next,
    });
  };

  const bumpWaistLossCm = (delta: number) => {
    const next = roundMetaHalfStep(
      Math.min(maxWaistLoss, Math.max(0, waistLossCm + delta))
    );
    patchMetas({ waistReductionTargetCm: next });
  };

  const temCint0 = cint0 != null && cint0 > 0;
  const pesoMetaSwitchOn = resolveMetaPerdaPesoAtiva(m);
  const cinturaMetaSwitchOn = resolveMetaReducaoCinturaAtiva(m, temCint0);
  const metasModuloResumo = resolveMetasTratamentoModuloResumo(m, temCint0);

  const renderMetaSwitchReadonly = (ariaLabel: string, active: boolean) => (
    <div
      role="switch"
      aria-checked={active}
      aria-disabled="true"
      aria-label={ariaLabel}
      tabIndex={-1}
      data-on={active ? 'true' : 'false'}
      title="Resumo automático: ligado se meta de peso ou de cintura estiver ativa."
      className="metaadmin-metas-switch-track relative h-6 w-[42px] shrink-0 cursor-default rounded-full p-[3px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] ring-1 ring-inset ring-black/5 transition-colors dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] dark:ring-white/10"
    >
      <span
        className={`pointer-events-none block h-[18px] w-[18px] rounded-full bg-white shadow-md ring-1 ring-black/[0.06] transition-transform duration-200 ease-out dark:ring-white/15 ${
          active ? 'translate-x-[18px]' : 'translate-x-0'
        }`}
      />
    </div>
  );

  const renderMetaToggle = (
    ariaLabel: string,
    active: boolean,
    onToggle: () => void,
    toggleDisabled?: boolean
  ) => (
    <button
      type="button"
      role="switch"
      aria-disabled={!!toggleDisabled}
      aria-checked={active}
      aria-label={ariaLabel}
      tabIndex={toggleDisabled ? -1 : undefined}
      title={toggleDisabled ? 'Indisponível sem circunferência inicial' : 'Ativar ou desativar esta meta'}
      data-on={active ? 'true' : 'false'}
      onClick={(e) => {
        e.preventDefault();
        if (toggleDisabled) return;
        onToggle();
      }}
      className={`metaadmin-metas-switch-track relative h-6 w-[42px] shrink-0 appearance-none rounded-full border-0 p-[3px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] ring-1 ring-inset ring-black/5 transition-colors dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] dark:ring-white/10 ${
        toggleDisabled ? 'cursor-not-allowed opacity-50 pointer-events-none' : 'cursor-pointer hover:opacity-95'
      }`}
    >
      <span
        className={`pointer-events-none block h-[18px] w-[18px] rounded-full bg-white shadow-md ring-1 ring-black/[0.06] transition-transform duration-200 ease-out dark:ring-white/15 ${
          active ? 'translate-x-[18px]' : 'translate-x-0'
        }`}
      />
    </button>
  );

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-5 bg-gradient-to-br from-slate-50/80 to-white dark:from-gray-900/50 dark:to-gray-900/80 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{sectionHeading}</h4>
          {!hideMetaHeading && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ajuste as metas com as barras. Os valores iniciais vêm de{' '}
              <span className="font-medium">Dados clínicos → Medidas iniciais</span>.
            </p>
          )}
        </div>
        <div
          className="shrink-0 rounded-xl border border-gray-200/90 bg-white/90 px-3 py-2.5 shadow-sm dark:border-gray-600/80 dark:bg-gray-800/90"
          title="Indicador automático conforme os switches de peso e cintura."
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-left">
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                Módulo de metas
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                Resumo (peso e/ou cintura)
              </p>
            </div>
            {renderMetaSwitchReadonly('Módulo de metas — resumo', metasModuloResumo)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-emerald-100 dark:border-emerald-900/40 bg-white/90 dark:bg-gray-800/60 p-4 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {renderMetaToggle(
                  'Ativar meta de perda de peso',
                  pesoMetaSwitchOn,
                  () => {
                    const next = !pesoMetaSwitchOn;
                    patchMetas({
                      metaPerdaPesoAtiva: next,
                      metasTratamentoModuloAtivo: next || cinturaMetaSwitchOn,
                    });
                  }
                )}
                <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Perda de Peso
                </h5>
              </div>
              {peso0 != null && peso0 > 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Peso inicial{' '}
                  <span className="font-semibold text-gray-700 dark:text-gray-200">{peso0} kg</span>
                </p>
              ) : (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Cadastre o peso inicial na aba <strong>Dados clínicos</strong> para ver o peso meta.
                </p>
              )}
            </div>
            {peso0 != null && peso0 > 0 && (
              <div className="text-right shrink-0">
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {pctLoss}%
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">do peso inicial</div>
              </div>
            )}
          </div>

          {peso0 != null && peso0 > 0 ? (
            <>
              <div className="relative pt-1 pb-0.5">
                <input
                  type="range"
                  min={kgMin}
                  max={kgMax}
                  step={META_STEP_KG}
                  value={kgPerda ?? kgMin}
                  disabled={!pesoMetaSwitchOn}
                  onChange={(e) => {
                    const kg = roundMetaHalfStep(parseFloat(e.target.value));
                    patchMetas({
                      weightLossTargetType: 'PESO_ABSOLUTO',
                      weightLossTargetValue: kg,
                    });
                  }}
                  className="metaadmin-metas-range w-full"
                  aria-label="Quilogramas a perder (meta)"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>{kgMin} kg</span>
                  <span>{kgMax} kg</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md bg-emerald-50/80 dark:bg-emerald-950/30 px-3 py-2 border border-emerald-100/80 dark:border-emerald-900/50 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-emerald-800/80 dark:text-emerald-300/80">
                      Perder
                    </div>
                    <div className="font-semibold text-emerald-900 dark:text-emerald-200 tabular-nums">
                      {kgPerda} kg
                    </div>
                  </div>
                  <div className="flex flex-col shrink-0 gap-0.5">
                    <button
                      type="button"
                      disabled={!pesoMetaSwitchOn || (kgPerda ?? kgMin) >= kgMax}
                      onClick={() => bumpKgPerda(META_STEP_KG)}
                      className="p-0.5 rounded border border-emerald-200/80 bg-white/90 text-emerald-800 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-emerald-800 dark:bg-gray-900/80 dark:text-emerald-200 dark:hover:bg-emerald-950"
                      aria-label="Aumentar meta de perda em 0,5 kg"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={!pesoMetaSwitchOn || (kgPerda ?? kgMin) <= kgMin}
                      onClick={() => bumpKgPerda(-META_STEP_KG)}
                      className="p-0.5 rounded border border-emerald-200/80 bg-white/90 text-emerald-800 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-emerald-800 dark:bg-gray-900/80 dark:text-emerald-200 dark:hover:bg-emerald-950"
                      aria-label="Diminuir meta de perda em 0,5 kg"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="rounded-md bg-slate-50 dark:bg-gray-900/80 px-3 py-2 border border-gray-200 dark:border-gray-600">
                  <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Peso meta
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                    {pesoMeta} kg
                  </div>
                </div>
                <div className="rounded-md bg-white dark:bg-gray-900/40 px-3 py-2 border border-emerald-200/70 dark:border-emerald-800/40">
                  <div className="text-[10px] uppercase tracking-wide text-emerald-800/80 dark:text-emerald-300/80">
                    Perdido
                  </div>
                  <div className="font-semibold text-emerald-900 dark:text-emerald-200 tabular-nums">
                    {kgPerdido == null ? '—' : `${kgPerdido} kg`}
                  </div>
                </div>
                <div className="rounded-md bg-slate-50 dark:bg-gray-900/80 px-3 py-2 border border-gray-200 dark:border-gray-600 flex flex-row items-stretch justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Peso atual
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                      {pesoAtualVal != null ? `${pesoAtualVal} kg` : '—'}
                    </div>
                  </div>
                  <div className="text-right shrink-0 border-l border-gray-200 dark:border-gray-600 pl-2 flex flex-col justify-center">
                    <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Meta
                    </div>
                    <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums leading-tight">
                      {pctMetaPeso != null ? `${pctMetaPeso}%` : '—'}
                    </div>
                    <div className="text-[9px] text-gray-400 dark:text-gray-500">atingida</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 opacity-60" aria-hidden />
          )}
        </div>

        <div className="rounded-lg border border-sky-100 dark:border-sky-900/40 bg-white/90 dark:bg-gray-800/60 p-4 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {renderMetaToggle(
                  'Ativar meta de redução de circunferência abdominal',
                  cinturaMetaSwitchOn,
                  () => {
                    const next = !cinturaMetaSwitchOn;
                    patchMetas({
                      metaReducaoCinturaAtiva: next,
                      metasTratamentoModuloAtivo: pesoMetaSwitchOn || next,
                    });
                  },
                  !temCint0
                )}
                <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Circ. Abdominal
                </h5>
              </div>
              {cint0 != null && cint0 > 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Circunferência inicial{' '}
                  <span className="font-semibold text-gray-700 dark:text-gray-200">{cint0} cm</span>
                </p>
              ) : (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Cadastre a circunferência abdominal inicial na aba <strong>Dados clínicos</strong>.
                </p>
              )}
            </div>
            {cint0 != null && cint0 > 0 && (
              <div className="text-right shrink-0">
                <div className="text-lg font-bold text-sky-700 dark:text-sky-400 tabular-nums">
                  −{waistLossCm} cm
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">redução alvo</div>
              </div>
            )}
          </div>

          {cint0 != null && cint0 > 0 ? (
            <>
              <div className="relative pt-1 pb-0.5">
                <input
                  type="range"
                  min={0}
                  max={maxWaistLoss}
                  step={META_STEP_CM}
                  value={waistLossCm}
                  disabled={!cinturaMetaSwitchOn}
                  onChange={(e) => {
                    const v = roundMetaHalfStep(parseFloat(e.target.value));
                    patchMetas({ waistReductionTargetCm: v });
                  }}
                  className="metaadmin-metas-range metaadmin-metas-range--waist w-full"
                  aria-label="Redução em cm da circunferência abdominal"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>0 cm</span>
                  <span>{maxWaistLoss} cm</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md bg-sky-50/80 dark:bg-sky-950/30 px-3 py-2 border border-sky-100/80 dark:border-sky-900/50 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-sky-800/80 dark:text-sky-300/80">
                      Reduzir
                    </div>
                    <div className="font-semibold text-sky-900 dark:text-sky-200 tabular-nums">
                      {waistLossCm} cm
                    </div>
                  </div>
                  <div className="flex flex-col shrink-0 gap-0.5">
                    <button
                      type="button"
                      disabled={!cinturaMetaSwitchOn || waistLossCm >= maxWaistLoss}
                      onClick={() => bumpWaistLossCm(META_STEP_CM)}
                      className="p-0.5 rounded border border-sky-200/80 bg-white/90 text-sky-800 hover:bg-sky-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-sky-800 dark:bg-gray-900/80 dark:text-sky-200 dark:hover:bg-sky-950"
                      aria-label="Aumentar redução alvo em 0,5 cm"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={!cinturaMetaSwitchOn || waistLossCm <= 0}
                      onClick={() => bumpWaistLossCm(-META_STEP_CM)}
                      className="p-0.5 rounded border border-sky-200/80 bg-white/90 text-sky-800 hover:bg-sky-100 disabled:opacity-40 disabled:cursor-not-allowed dark:border-sky-800 dark:bg-gray-900/80 dark:text-sky-200 dark:hover:bg-sky-950"
                      aria-label="Diminuir redução alvo em 0,5 cm"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="rounded-md bg-slate-50 dark:bg-gray-900/80 px-3 py-2 border border-gray-200 dark:border-gray-600">
                  <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Circunferência meta
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                    {cinturaMeta} cm
                  </div>
                </div>
                <div className="rounded-md bg-white dark:bg-gray-900/40 px-3 py-2 border border-sky-200/70 dark:border-sky-800/40">
                  <div className="text-[10px] uppercase tracking-wide text-sky-800/80 dark:text-sky-300/80">
                    Reduzido
                  </div>
                  <div className="font-semibold text-sky-900 dark:text-sky-200 tabular-nums">
                    {cmReduzido == null ? '—' : `${cmReduzido} cm`}
                  </div>
                </div>
                <div className="rounded-md bg-slate-50 dark:bg-gray-900/80 px-3 py-2 border border-gray-200 dark:border-gray-600 flex flex-row items-stretch justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Atual
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                      {circAtualVal != null ? `${circAtualVal} cm` : '—'}
                    </div>
                  </div>
                  <div className="text-right shrink-0 border-l border-gray-200 dark:border-gray-600 pl-2 flex flex-col justify-center">
                    <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Meta
                    </div>
                    <div className="text-lg font-bold text-sky-700 dark:text-sky-400 tabular-nums leading-tight">
                      {pctMetaCint != null ? `${pctMetaCint}%` : '—'}
                    </div>
                    <div className="text-[9px] text-gray-400 dark:text-gray-500">atingida</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 opacity-60" aria-hidden />
          )}
        </div>
      </div>
    </div>
  );
}
