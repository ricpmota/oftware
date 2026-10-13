import type {
  CheckInSemanalNutriAnsweredBy,
  CheckInSemanalNutriSource,
  CheckInSemanalNutriWizardMode,
} from '@/lib/nutri/checkInSemanalNutriTypes';

export type CheckInSemanalNutriActorKind = 'patient' | 'nutritionist' | 'doctor';

export type CheckInSemanalNutriAuthorship = {
  mode: CheckInSemanalNutriWizardMode;
  answeredBy: CheckInSemanalNutriAnsweredBy;
  source: CheckInSemanalNutriSource;
};

/**
 * Mapeia o ator da UI para autoria persistida.
 * O wizard público (`public`) reutiliza as mesmas perguntas; só muda `source`.
 */
export function mapCheckInSemanalNutriAuthorship(
  actor: CheckInSemanalNutriActorKind,
  options?: { publicLink?: boolean }
): CheckInSemanalNutriAuthorship {
  if (options?.publicLink) {
    return {
      mode: 'public',
      answeredBy: 'patient',
      source: 'patient_public_link',
    };
  }

  if (actor === 'nutritionist') {
    return {
      mode: 'nutritionist',
      answeredBy: 'nutritionist',
      source: 'nutritionist',
    };
  }

  if (actor === 'doctor') {
    return {
      mode: 'nutritionist',
      answeredBy: 'doctor',
      source: 'doctor',
    };
  }

  return {
    mode: 'patient',
    answeredBy: 'patient',
    source: 'patient_meta',
  };
}

export function resolveNutritionistIdForCheckIn(params: {
  actor: CheckInSemanalNutriActorKind;
  actorId?: string | null;
  nutricionistaVinculadoIds?: string[] | null;
}): string | undefined {
  if (params.actor === 'nutritionist') {
    const id = params.actorId?.trim();
    if (id) return id;
  }
  const linked = (params.nutricionistaVinculadoIds || []).find((id) => String(id || '').trim());
  return linked ? String(linked).trim() : undefined;
}

export function resolveWeeklyCheckInSaveAuthorship(input: {
  existing?: {
    answeredBy: CheckInSemanalNutriAnsweredBy;
    answeredById?: string;
    source: CheckInSemanalNutriSource;
  } | null;
  actor: {
    answeredBy: CheckInSemanalNutriAnsweredBy;
    answeredById?: string;
    source: CheckInSemanalNutriSource;
  };
}): {
  answeredBy: CheckInSemanalNutriAnsweredBy;
  answeredById?: string;
  source: CheckInSemanalNutriSource;
  lastEditedBy?: CheckInSemanalNutriAnsweredBy;
  lastEditedById?: string;
} {
  if (!input.existing) {
    return {
      answeredBy: input.actor.answeredBy,
      answeredById: input.actor.answeredById,
      source: input.actor.source,
    };
  }
  return {
    answeredBy: input.existing.answeredBy,
    answeredById: input.existing.answeredById,
    source: input.existing.source,
    lastEditedBy: input.actor.answeredBy,
    lastEditedById: input.actor.answeredById,
  };
}
