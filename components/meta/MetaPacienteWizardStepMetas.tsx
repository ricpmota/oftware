'use client';

import type { PacienteCompleto } from '@/types/obesidade';
import { META_STEP_CM, META_STEP_KG, roundMetaHalfStep } from '@/utils/metaadminMetasUiSteps';
import { temCircunferenciaInicialParaMetas } from '@/lib/meta/metaChatInicial';

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
  let kgLoss = peso0 != null && peso0 > 0 ? roundMetaHalfStep((peso0 * pctLoss) / 100) : 0;
  if (peso0 != null && peso0 > 0 && kgMax >= kgMin) {
    kgLoss = roundMetaHalfStep(Math.min(kgMax, Math.max(kgMin, kgLoss)));
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

  const pesoMeta = peso0 != null && peso0 > 0 ? roundMetaHalfStep(peso0 - kgLoss) : null;
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
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-800">Quanto deseja perder (peso)</span>
            <span className="text-lg font-bold tabular-nums text-emerald-600">{kgLoss} kg</span>
          </div>
          <input
            type="range"
            min={kgMin}
            max={kgMax}
            step={META_STEP_KG}
            value={kgLoss}
            onChange={(e) => {
              const kg = roundMetaHalfStep(parseFloat(e.target.value));
              if (!peso0 || peso0 <= 0) return;
              let pctNew = (kg / peso0) * 100;
              pctNew = Math.round(Math.min(pctMax, Math.max(pctMin, pctNew)) * 10) / 10;
              patchMetasPartial({
                weightLossTargetType: 'PERCENTUAL',
                weightLossTargetValue: pctNew,
              });
            }}
            className="metaadmin-metas-range w-full"
            aria-label="Quilogramas de peso a perder"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>{kgMin} kg</span>
            <span>{kgMax} kg</span>
          </div>
          <p className="text-xs leading-snug text-slate-600">
            ≈ <span className="font-semibold text-emerald-700">{pctLoss}%</span> do peso inicial ({peso0} kg).
            Peso meta ~<span className="font-medium text-slate-900">{pesoMeta}</span> kg.
          </p>
        </div>
      ) : (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Falta peso inicial — volte ao passo de medidas.
        </p>
      )}

      {temCint && cint0 != null && cint0 > 0 ? (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-800">Circunferência abdominal</span>
            <span className="text-base font-bold tabular-nums text-teal-700">−{waistLossCm} cm</span>
          </div>
          <p className="text-xs text-slate-500">
            Cintura inicial: {cint0} cm · Meta ~{cinturaMeta} cm
          </p>
          <input
            type="range"
            min={0}
            max={maxWaistLossSlider > 0 ? maxWaistLossSlider : maxWaistLoss}
            step={META_STEP_CM}
            value={waistLossCm}
            onChange={(e) => {
              patchMetasPartial({ waistReductionTargetCm: roundMetaHalfStep(parseFloat(e.target.value)) });
            }}
            className="metaadmin-metas-range w-full"
            aria-label="Centímetros de redução na cintura"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>0 cm</span>
            <span>{maxWaistLossSlider > 0 ? maxWaistLossSlider : maxWaistLoss} cm</span>
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

  let kgP = peso0 != null && peso0 > 0 ? roundMetaHalfStep((peso0 * pct) / 100) : null;
  if (kgP != null && peso0 != null && peso0 > 0) {
    pct = Math.round(Math.min(pctMax, Math.max(pctMin, (kgP / peso0) * 100)) * 10) / 10;
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
