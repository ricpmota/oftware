'use client';

import { Ruler, Scale } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import RulerPicker from '@/components/meta/RulerPicker';
import { kgLossFromPercent, percentLossFromKg, roundMetaTenth } from '@/lib/meta/rulerPickerMath';
import { META_STEP_CM, META_STEP_KG, roundMetaHalfStep } from '@/utils/metaadminMetasUiSteps';
import { temCircunferenciaInicialParaMetas } from '@/lib/meta/metaChatInicial';

const META_RULER_STEP_KG = 0.1;

function formatPt(value: number, digits: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

type Props = {
  paciente: PacienteCompleto;
  setPaciente: React.Dispatch<React.SetStateAction<PacienteCompleto>>;
};

export default function MetaPacienteWizardStepMetas({ paciente, setPaciente }: Props) {
  const mi = paciente.dadosClinicos?.medidasIniciais;
  const peso0 = mi?.peso;
  const cint0 = mi?.circunferenciaAbdominal;
  const temCint = temCircunferenciaInicialParaMetas(mi);
  const m = paciente.planoTerapeutico?.metas;

  const pctMin = 5;
  const pctMax = 45;
  let pctLoss =
    m?.weightLossTargetType === 'PERCENTUAL' && m.weightLossTargetValue != null && m.weightLossTargetValue > 0
      ? m.weightLossTargetValue
      : m?.weightLossTargetType === 'PESO_ABSOLUTO' &&
          m.weightLossTargetValue != null &&
          peso0 != null &&
          peso0 > 0
        ? (m.weightLossTargetValue / peso0) * 100
        : 12;
  pctLoss = Math.round(Math.min(pctMax, Math.max(pctMin, pctLoss)) * 10) / 10;

  const kgMinRaw = peso0 != null && peso0 > 0 ? (peso0 * pctMin) / 100 : 0;
  const kgMaxRaw = peso0 != null && peso0 > 0 ? (peso0 * pctMax) / 100 : 0;
  const kgMin = peso0 != null && peso0 > 0 ? Math.ceil(kgMinRaw * (1 / META_STEP_KG)) * META_STEP_KG : 0;
  const kgMax = peso0 != null && peso0 > 0 ? Math.floor(kgMaxRaw * (1 / META_STEP_KG)) * META_STEP_KG : 0;
  let kgLoss = peso0 != null && peso0 > 0 ? kgLossFromPercent(pctLoss, peso0) : 0;
  if (peso0 != null && peso0 > 0 && kgMax >= kgMin) {
    kgLoss = roundMetaTenth(Math.min(kgMax, Math.max(kgMin, kgLoss)));
  }

  const maxWaistLoss =
    cint0 != null && cint0 > 60
      ? Math.min(40, Math.round((cint0 - 55) * 10) / 10)
      : cint0 != null && cint0 > 0
        ? Math.min(30, Math.round(cint0 * 0.25 * 10) / 10)
        : 25;
  const maxWaistLossSlider = Math.max(0, Math.floor(maxWaistLoss / META_STEP_CM) * META_STEP_CM);
  let waistLossCm =
    typeof m?.waistReductionTargetCm === 'number' && !Number.isNaN(m.waistReductionTargetCm)
      ? m.waistReductionTargetCm
      : 8;
  waistLossCm = roundMetaHalfStep(
    Math.min(maxWaistLossSlider > 0 ? maxWaistLossSlider : maxWaistLoss, Math.max(0, waistLossCm))
  );

  const pesoMeta = peso0 != null && peso0 > 0 ? roundMetaTenth(peso0 - kgLoss) : null;
  const cinturaMeta = temCint && cint0 != null ? roundMetaHalfStep(cint0 - waistLossCm) : null;

  const patchMetasPartial = (partial: Record<string, unknown>) => {
    setPaciente((prev) => ({
      ...prev,
      planoTerapeutico: {
        ...prev.planoTerapeutico,
        metas: {
          ...prev.planoTerapeutico?.metas,
          ...partial,
        },
      },
    }));
  };

  return (
    <div className="space-y-4">
      {peso0 != null && peso0 > 0 ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                <span className="text-sm font-semibold text-slate-800">Quanto deseja perder (peso)</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Arraste a régua para definir a meta</p>
            </div>
            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              kg
            </span>
          </div>
          <p className="text-center leading-none">
            <span className="text-4xl font-bold tabular-nums tracking-tight text-emerald-600">
              {formatPt(kgLoss, 1)}
            </span>
            <span className="ml-1 text-base font-semibold text-emerald-700">kg</span>
          </p>
          <RulerPicker
            value={kgLoss}
            min={kgMin}
            max={kgMax >= kgMin ? kgMax : kgMin}
            step={META_RULER_STEP_KG}
            unit="kg"
            onChange={(kg) => {
              if (!peso0 || peso0 <= 0) return;
              patchMetasPartial({
                weightLossTargetType: 'PERCENTUAL',
                weightLossTargetValue: percentLossFromKg(roundMetaTenth(kg), peso0, pctMin, pctMax),
              });
            }}
          />
          <div className="rounded-lg bg-emerald-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
            <p>
              ≈ <span className="font-semibold text-emerald-600">{formatPt(pctLoss, 1)}%</span> do seu peso inicial (
              {formatPt(peso0, Number.isInteger(peso0) ? 0 : 1)} kg)
            </p>
            <p>
              Peso meta: ~
              <span className="font-semibold text-emerald-600">
                {pesoMeta != null ? `${formatPt(pesoMeta, 1)} kg` : '—'}
              </span>
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Falta peso inicial — volte ao passo de medidas.
        </p>
      )}

      {temCint && cint0 != null && cint0 > 0 ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                <span className="text-sm font-semibold text-slate-800">Circunferência abdominal</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Arraste a régua para definir a meta</p>
            </div>
            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              cm
            </span>
          </div>
          <p className="text-center leading-none">
            <span className="text-4xl font-bold tabular-nums tracking-tight text-emerald-600">
              −{formatPt(waistLossCm, 1)}
            </span>
            <span className="ml-1 text-base font-semibold text-emerald-700">cm</span>
          </p>
          <RulerPicker
            value={waistLossCm}
            min={0}
            max={maxWaistLossSlider > 0 ? maxWaistLossSlider : maxWaistLoss}
            step={META_STEP_CM}
            unit="cm"
            ariaLabel={`Meta de redução da circunferência: ${formatPt(waistLossCm, 1)} centímetros`}
            onChange={(cm) => {
              patchMetasPartial({ waistReductionTargetCm: roundMetaHalfStep(cm) });
            }}
          />
          <div className="rounded-lg bg-emerald-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
            <p>
              Cintura inicial:{' '}
              <span className="font-semibold text-emerald-600">
                {formatPt(cint0, Number.isInteger(cint0) ? 0 : 1)} cm
              </span>
            </p>
            <p>
              Circunferência meta: ~
              <span className="font-semibold text-emerald-600">
                {cinturaMeta != null ? `${formatPt(cinturaMeta, 1)} cm` : '—'}
              </span>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Normaliza metas antes de salvar (mesma regra do chat legado). */
export function buildPacienteComMetasFinalizadas(p: PacienteCompleto): PacienteCompleto {
  const mi = p.dadosClinicos?.medidasIniciais;
  const peso0 = mi?.peso;
  const cint0 = mi?.circunferenciaAbdominal;
  const temCint = temCircunferenciaInicialParaMetas(mi);
  const m = p.planoTerapeutico?.metas;

  const pctMin = 5;
  const pctMax = 45;
  let pct =
    m?.weightLossTargetType === 'PERCENTUAL' && m.weightLossTargetValue != null && m.weightLossTargetValue > 0
      ? m.weightLossTargetValue
      : 12;
  pct = Math.round(Math.min(pctMax, Math.max(pctMin, pct)) * 10) / 10;

  const maxW =
    cint0 != null && cint0 > 60
      ? Math.min(40, Math.round((cint0 - 55) * 10) / 10)
      : cint0 != null && cint0 > 0
        ? Math.min(30, Math.round(cint0 * 0.25 * 10) / 10)
        : 25;
  const maxWSlider = Math.max(0, Math.floor(maxW / META_STEP_CM) * META_STEP_CM);
  let waist =
    typeof m?.waistReductionTargetCm === 'number' && !Number.isNaN(m.waistReductionTargetCm)
      ? m.waistReductionTargetCm
      : 8;
  waist = roundMetaHalfStep(Math.min(maxWSlider > 0 ? maxWSlider : maxW, Math.max(0, waist)));

  let kgP = peso0 != null && peso0 > 0 ? kgLossFromPercent(pct, peso0) : null;
  if (kgP != null && peso0 != null && peso0 > 0) {
    pct = percentLossFromKg(kgP, peso0, pctMin, pctMax);
  }

  const pesoAtivo = peso0 != null && peso0 > 0;
  const cintAtivo = temCint;
  const metasFinal: Record<string, unknown> = {
    ...p.planoTerapeutico?.metas,
    metaPerdaPesoAtiva: pesoAtivo,
    metaReducaoCinturaAtiva: cintAtivo,
    metasTratamentoModuloAtivo: pesoAtivo || cintAtivo,
    weightLossTargetType: 'PERCENTUAL',
    weightLossTargetValue: pct,
  };
  if (temCint) {
    metasFinal.waistReductionTargetCm = waist;
  } else {
    delete metasFinal.waistReductionTargetCm;
    metasFinal.metaReducaoCinturaAtiva = false;
  }

  return {
    ...p,
    planoTerapeutico: {
      ...p.planoTerapeutico,
      metas: metasFinal as PacienteCompleto['planoTerapeutico']['metas'],
    },
  };
}
