export type CheckInSemanalNutriViewerRole = 'patient' | 'nutritionist' | 'doctor' | 'personal';

export type CheckInSemanalNutriCapabilities = {
  create: boolean;
  edit: boolean;
  editCurrentWeek: boolean;
  view: boolean;
  fillOnBehalf: boolean;
  configureSchedule: boolean;
  delete: boolean;
};

const CAPS: Record<CheckInSemanalNutriViewerRole, CheckInSemanalNutriCapabilities> = {
  patient: { create: true, edit: false, editCurrentWeek: true, view: true, fillOnBehalf: false, configureSchedule: false, delete: false },
  nutritionist: { create: true, edit: true, editCurrentWeek: true, view: true, fillOnBehalf: true, configureSchedule: true, delete: true },
  doctor: { create: true, edit: true, editCurrentWeek: true, view: true, fillOnBehalf: true, configureSchedule: false, delete: true },
  personal: { create: false, edit: false, editCurrentWeek: false, view: true, fillOnBehalf: false, configureSchedule: false, delete: false },
};

export function resolveCheckInSemanalNutriViewerRole(input: {
  chatNutriAuthorKind?: 'patient' | 'doctor' | 'nutritionist' | null;
  modoNutricionista?: boolean;
  somenteVisualizacao?: boolean;
}): CheckInSemanalNutriViewerRole {
  if (input.somenteVisualizacao) return 'personal';
  if (input.chatNutriAuthorKind === 'doctor') return 'doctor';
  if (input.chatNutriAuthorKind === 'nutritionist' || input.modoNutricionista) return 'nutritionist';
  return 'patient';
}

export function getCheckInSemanalNutriCapabilities(
  role: CheckInSemanalNutriViewerRole
): CheckInSemanalNutriCapabilities {
  return CAPS[role];
}

/** Check-in Diário não é mais funcionalidade do produto. */
export const CHECK_IN_DIARIO_NUTRI_ENABLED = false;
