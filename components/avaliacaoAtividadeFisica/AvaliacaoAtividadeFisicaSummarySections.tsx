'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  isGymLocation,
  isHomeLocation,
  isOutdoorsLocation,
  type AvaliacaoReviewEditBlock,
} from '@/lib/avaliacaoAtividadeFisica/questionsBasic';
import {
  BALANCE_FALL_OPTIONS,
  BARRIER_OPTIONS,
  BODY_PRIORITY_OPTIONS,
  BP_ADVICE_OPTIONS,
  CARDIO_ACTIVITY_OPTIONS,
  CARDIO_PREFERENCE_OPTIONS,
  CHEST_SYMPTOM_OPTIONS,
  CURRENT_ACTIVITY_OPTIONS,
  CURRENT_PAIN_OPTIONS,
  DIZZINESS_OPTIONS,
  DURATION_CONSISTENCY_OPTIONS,
  ENVIRONMENT_NOISE_OPTIONS,
  EQUIPMENT_ACCESS_OPTIONS,
  FLOOR_EXERCISE_OPTIONS,
  getDurationLabel,
  getEquipmentLabels,
  getExperienceLabel,
  getPrimaryGoalLabel,
  getSafetyReasonLabel,
  getSecondaryGoalLabels,
  getTrainingLocationLabel,
  getWeekdayLabels,
  GYM_AREA_OPTIONS,
  GYM_STRUCTURE_OPTIONS,
  HOME_SPACE_OPTIONS,
  INJURY_LIMITS_OPTIONS,
  INJURY_STATUS_OPTIONS,
  INTENSITY_OPTIONS,
  labelFromOptions,
  labelsFromOptions,
  MODALITY_OPTIONS,
  MOVEMENT_LIMITATION_OPTIONS,
  OUTDOOR_SPACE_OPTIONS,
  PAIN_IMPACT_OPTIONS,
  PAIN_REGION_OPTIONS,
  PAIN_TRIGGER_OPTIONS,
  PALPITATION_OPTIONS,
  PROFESSIONAL_RESTRICTION_OPTIONS,
  SHORTNESS_OF_BREATH_OPTIONS,
  SURGERY_STATUS_OPTIONS,
  SURGERY_TIMING_OPTIONS,
  TRAINING_PERIOD_OPTIONS,
} from '@/lib/avaliacaoAtividadeFisica/summaryLabels';
import type {
  AvaliacaoAtividadeFisicaSafety,
  AvaliacaoAtividadeFisicaSummary,
} from '@/types/avaliacaoAtividadeFisica';

export type SummarySectionRow = { label: string; value: string };

function join(values: string[]): string {
  return values.filter(Boolean).join(', ');
}

function SummarySectionCard({
  title,
  rows,
  editLabel,
  onEdit,
  attention,
  defaultOpen = true,
  showEdit,
}: {
  title: string;
  rows: SummarySectionRow[];
  editLabel?: string;
  onEdit?: () => void;
  attention?: string[];
  defaultOpen?: boolean;
  showEdit?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const visibleRows = rows.filter((r) => r.value && r.value !== 'Não informado');

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50"
      >
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
          {attention && attention.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 space-y-1.5">
              <p className="text-sm text-amber-900 font-medium">
                Algumas respostas precisam ser consideradas por um profissional antes da criação ou
                do ajuste do treino.
              </p>
              <ul className="text-xs text-amber-800 list-disc pl-4 space-y-0.5">
                {attention.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          <dl className="space-y-2.5 pt-2">
            {visibleRows.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma informação nesta seção.</p>
            ) : (
              visibleRows.map((row) => (
                <div key={row.label}>
                  <dt className="text-xs font-medium text-slate-500">{row.label}</dt>
                  <dd className="text-sm text-slate-800 mt-0.5">{row.value}</dd>
                </div>
              ))
            )}
          </dl>
          {showEdit && onEdit && editLabel ? (
            <button
              type="button"
              onClick={onEdit}
              className="w-full mt-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {editLabel}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

export function buildGoalsRows(summary: AvaliacaoAtividadeFisicaSummary): SummarySectionRow[] {
  const g = summary.goalProfile;
  return [
    {
      label: 'Objetivo principal',
      value:
        g.primaryGoal === 'other'
          ? g.primaryGoalOther?.trim() || 'Outro'
          : getPrimaryGoalLabel(g.primaryGoal),
    },
    {
      label: 'Outros objetivos',
      value: join(getSecondaryGoalLabels(g.secondaryGoals)),
    },
    { label: 'Experiência', value: getExperienceLabel(g.experienceLevel) },
    {
      label: 'Atividade atual',
      value:
        g.currentlyActive === false
          ? 'Não pratica atualmente'
          : g.currentlyActive === true
            ? join([
                ...labelsFromOptions(CURRENT_ACTIVITY_OPTIONS, g.currentActivities),
                g.currentActivityOther?.trim() || '',
                g.currentFrequencyPerWeek != null
                  ? `${g.currentFrequencyPerWeek} vez${g.currentFrequencyPerWeek === 1 ? '' : 'es'} por semana`
                  : '',
              ])
            : 'Não informado',
    },
  ];
}

export function buildRoutineRows(summary: AvaliacaoAtividadeFisicaSummary): SummarySectionRow[] {
  const r = summary.routine;
  return [
    {
      label: 'Dias disponíveis',
      value:
        r.availableDaysPerWeek != null
          ? `${r.availableDaysPerWeek} dia${r.availableDaysPerWeek === 1 ? '' : 's'} por semana`
          : 'Não informado',
    },
    {
      label: 'Dias preferidos',
      value: r.variableSchedule
        ? 'Rotina variável'
        : join(getWeekdayLabels(r.preferredWeekdays)) || 'Não informado',
    },
    {
      label: 'Duração por treino',
      value: getDurationLabel(r.sessionDurationMinutes),
    },
    {
      label: 'Estabilidade do tempo',
      value: labelFromOptions(DURATION_CONSISTENCY_OPTIONS, r.durationConsistency),
    },
    {
      label: 'Horário preferido',
      value: labelFromOptions(TRAINING_PERIOD_OPTIONS, r.preferredTrainingPeriod),
    },
    {
      label: 'Horário aproximado',
      value: r.preferredTrainingTime?.trim() || '',
    },
    {
      label: 'Local',
      value:
        r.trainingLocation === 'other'
          ? r.trainingLocationOther?.trim() || 'Outro'
          : getTrainingLocationLabel(r.trainingLocation),
    },
  ];
}

export function buildProfileRows(summary: AvaliacaoAtividadeFisicaSummary): SummarySectionRow[] {
  const p = summary.trainingProfile;
  const priorities = labelsFromOptions(BODY_PRIORITY_OPTIONS, p.bodyPriorities);
  return [
    {
      label: 'Prioridades corporais',
      value: priorities.map((label, i) => `${i + 1}ª ${label}`).join(' · '),
    },
    {
      label: 'Modalidades',
      value: join(labelsFromOptions(MODALITY_OPTIONS, p.preferredModalities)),
    },
    {
      label: 'Intensidade',
      value: labelFromOptions(INTENSITY_OPTIONS, p.preferredIntensity),
    },
    {
      label: 'Cardio',
      value: labelFromOptions(CARDIO_PREFERENCE_OPTIONS, p.cardioPreference),
    },
    {
      label: 'Atividades aeróbicas',
      value: join([
        ...labelsFromOptions(CARDIO_ACTIVITY_OPTIONS, p.preferredCardioActivities),
        p.preferredCardioOther?.trim() || '',
      ]),
    },
    {
      label: 'Exercícios favoritos',
      value: p.favoriteExercisesText?.trim() || '',
    },
    {
      label: 'Exercícios evitados',
      value: p.avoidedExercisesText?.trim() || '',
    },
    {
      label: 'Barreiras',
      value: join([
        ...labelsFromOptions(BARRIER_OPTIONS, p.trainingBarriers),
        p.trainingBarrierOther?.trim() || '',
      ]),
    },
  ];
}

export function buildEnvironmentRows(summary: AvaliacaoAtividadeFisicaSummary): SummarySectionRow[] {
  const e = summary.environment;
  const rows: SummarySectionRow[] = [
    {
      label: 'Local',
      value:
        e.trainingLocation === 'other'
          ? summary.routine.trainingLocationOther?.trim() || 'Outro'
          : getTrainingLocationLabel(e.trainingLocation),
    },
  ];

  if (isGymLocation(e.trainingLocation)) {
    rows.push(
      {
        label: 'Estrutura da academia',
        value: labelFromOptions(GYM_STRUCTURE_OPTIONS, e.gymStructureLevel),
      },
      {
        label: 'Áreas disponíveis',
        value: join(labelsFromOptions(GYM_AREA_OPTIONS, e.gymAvailableAreas)),
      }
    );
  }
  if (isHomeLocation(e.trainingLocation)) {
    rows.push({
      label: 'Espaço em casa',
      value: labelFromOptions(HOME_SPACE_OPTIONS, e.homeTrainingSpace),
    });
  }
  rows.push({
    label: 'Equipamentos',
    value: join([
      ...getEquipmentLabels(e.availableEquipment),
      e.availableEquipmentOther?.trim() || '',
    ]),
  });
  const eq = e.availableEquipment || [];
  if (eq.length > 0 && !eq.includes('none') && !eq.includes('unknown')) {
    rows.push({
      label: 'Acesso aos equipamentos',
      value: labelFromOptions(EQUIPMENT_ACCESS_OPTIONS, e.equipmentAccessFrequency),
    });
  }
  if (isOutdoorsLocation(e.trainingLocation)) {
    rows.push({
      label: 'Espaços ao ar livre',
      value: join([
        ...labelsFromOptions(OUTDOOR_SPACE_OPTIONS, e.outdoorEnvironment),
        e.outdoorEnvironmentOther?.trim() || '',
      ]),
    });
  }
  rows.push(
    {
      label: 'Exercícios no chão',
      value: labelFromOptions(FLOOR_EXERCISE_OPTIONS, e.floorExerciseAvailability),
    },
    {
      label: 'Impacto ou barulho (ambiente)',
      value: labelFromOptions(ENVIRONMENT_NOISE_OPTIONS, e.environmentImpactNoiseRestriction),
    },
    {
      label: 'Observações do local',
      value: e.environmentNotes?.trim() || '',
    }
  );
  return rows;
}

export function buildSafetyRows(summary: AvaliacaoAtividadeFisicaSummary): SummarySectionRow[] {
  const s = summary.clinicalSafety;
  const rows: SummarySectionRow[] = [
    {
      label: 'Dor atual',
      value: labelFromOptions(CURRENT_PAIN_OPTIONS, s.currentPainLevel),
    },
  ];
  if (s.currentPainLevel && s.currentPainLevel !== 'none') {
    rows.push(
      {
        label: 'Regiões com dor',
        value: join([
          ...labelsFromOptions(PAIN_REGION_OPTIONS, s.painRegions),
          s.painRegionOther?.trim() || '',
        ]),
      },
      {
        label: 'Quando aparece',
        value: join([
          ...labelsFromOptions(PAIN_TRIGGER_OPTIONS, s.painTriggers),
          s.painTriggerOther?.trim() || '',
        ]),
      },
      {
        label: 'Impacto funcional',
        value: labelFromOptions(PAIN_IMPACT_OPTIONS, s.painFunctionalImpact),
      }
    );
  }
  rows.push({
    label: 'Lesão',
    value: labelFromOptions(INJURY_STATUS_OPTIONS, s.injuryStatus),
  });
  if (
    s.injuryStatus === 'recovered' ||
    s.injuryStatus === 'recovering' ||
    s.injuryStatus === 'current'
  ) {
    rows.push(
      { label: 'Detalhes da lesão', value: s.injuryDetails?.trim() || '' },
      {
        label: 'Limita movimento',
        value: labelFromOptions(INJURY_LIMITS_OPTIONS, s.injuryCurrentlyLimitsMovement),
      }
    );
  }
  rows.push({
    label: 'Cirurgia',
    value: labelFromOptions(SURGERY_STATUS_OPTIONS, s.surgeryStatus),
  });
  if (s.surgeryStatus && s.surgeryStatus !== 'no') {
    rows.push(
      { label: 'Detalhes da cirurgia', value: s.surgeryDetails?.trim() || '' },
      {
        label: 'Quando foi realizada',
        value: labelFromOptions(SURGERY_TIMING_OPTIONS, s.surgeryTiming),
      }
    );
  }
  rows.push(
    {
      label: 'Limitações de movimento',
      value: join([
        ...labelsFromOptions(MOVEMENT_LIMITATION_OPTIONS, s.movementLimitations),
        s.movementLimitationOther?.trim() || '',
      ]),
    },
    {
      label: 'Equilíbrio e quedas',
      value: labelFromOptions(BALANCE_FALL_OPTIONS, s.balanceFallHistory),
    },
    {
      label: 'Falta de ar',
      value: labelFromOptions(SHORTNESS_OF_BREATH_OPTIONS, s.shortnessOfBreathOnLightEffort),
    },
    {
      label: 'Sintomas no peito',
      value: labelFromOptions(CHEST_SYMPTOM_OPTIONS, s.chestSymptomsDuringEffort),
    },
    {
      label: 'Tontura ou desmaio',
      value: labelFromOptions(DIZZINESS_OPTIONS, s.dizzinessOrFaintingDuringEffort),
    },
    {
      label: 'Palpitações',
      value: labelFromOptions(PALPITATION_OPTIONS, s.palpitationsDuringExercise),
    },
    {
      label: 'Pressão arterial',
      value: labelFromOptions(BP_ADVICE_OPTIONS, s.uncontrolledBloodPressureAdvice),
    },
    {
      label: 'Restrição profissional',
      value: labelFromOptions(
        PROFESSIONAL_RESTRICTION_OPTIONS,
        s.professionalExerciseRestriction
      ),
    }
  );
  if (
    s.professionalExerciseRestriction &&
    s.professionalExerciseRestriction !== 'no'
  ) {
    rows.push({
      label: 'Detalhes da restrição',
      value: s.professionalExerciseRestrictionDetails?.trim() || '',
    });
  }
  rows.push({
    label: 'Outros cuidados',
    value: s.additionalSafetyNotes?.trim() || '',
  });
  return rows;
}

export type AvaliacaoAtividadeFisicaSummarySectionsProps = {
  summary: AvaliacaoAtividadeFisicaSummary;
  safety: AvaliacaoAtividadeFisicaSafety;
  mode: 'patient_review' | 'professional_readonly';
  onEditBlock?: (block: AvaliacaoReviewEditBlock) => void;
  /** Texto do card de atenção no topo da seção clínica (patient_review usa o da Review). */
  attentionIntroProfessional?: boolean;
  /** Seções abertas por padrão. Profissionais em sheet: preferir false. */
  defaultOpen?: boolean;
};

export function AvaliacaoAtividadeFisicaSummarySections({
  summary,
  safety,
  mode,
  onEditBlock,
  attentionIntroProfessional = false,
  defaultOpen = true,
}: AvaliacaoAtividadeFisicaSummarySectionsProps) {
  const showEdit = mode === 'patient_review' && Boolean(onEditBlock);
  const attentionLabels = safety.requiresProfessionalAttention
    ? safety.reasons.map(getSafetyReasonLabel)
    : [];

  const safetyAttention =
    mode === 'patient_review' && attentionLabels.length > 0 ? attentionLabels : undefined;

  return (
    <div className="space-y-4">
      {attentionIntroProfessional && attentionLabels.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
          <p className="text-sm font-semibold text-amber-900">
            Pontos que merecem atenção profissional
          </p>
          <p className="text-sm text-amber-800 leading-relaxed">
            A avaliação identificou respostas que devem ser consideradas antes da definição ou do
            ajuste do treino.
          </p>
          <ul className="text-xs text-amber-800 list-disc pl-4 space-y-0.5">
            {attentionLabels.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <SummarySectionCard
        title="Objetivos e experiência"
        rows={buildGoalsRows(summary)}
        showEdit={showEdit}
        editLabel="Editar objetivos"
        onEdit={() => onEditBlock?.('goals')}
        defaultOpen={defaultOpen}
      />
      <SummarySectionCard
        title="Rotina e disponibilidade"
        rows={buildRoutineRows(summary)}
        showEdit={showEdit}
        editLabel="Editar rotina"
        onEdit={() => onEditBlock?.('routine')}
        defaultOpen={defaultOpen}
      />
      <SummarySectionCard
        title="Preferências de treino"
        rows={buildProfileRows(summary)}
        showEdit={showEdit}
        editLabel="Editar preferências"
        onEdit={() => onEditBlock?.('profile')}
        defaultOpen={defaultOpen}
      />
      <SummarySectionCard
        title="Local e equipamentos"
        rows={buildEnvironmentRows(summary)}
        showEdit={showEdit}
        editLabel="Editar ambiente"
        onEdit={() => onEditBlock?.('environment')}
        defaultOpen={defaultOpen}
      />
      <SummarySectionCard
        title="Segurança e limitações"
        rows={buildSafetyRows(summary)}
        showEdit={showEdit}
        editLabel="Editar segurança"
        onEdit={() => onEditBlock?.('safety')}
        attention={safetyAttention}
        defaultOpen={defaultOpen}
      />
    </div>
  );
}

export default AvaliacaoAtividadeFisicaSummarySections;
