import type { PersonalWorkoutTemplate } from '@/lib/personal/planosTreino';
import type { PacienteVisivelPersonal } from '@/services/pacientePersonalTrainerService';

export const TREINOS_WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type TreinosWeekday = (typeof TREINOS_WEEKDAYS)[number];

export const TREINOS_WEEKDAY_LABELS: Record<TreinosWeekday, { short: string; long: string }> = {
  monday: { short: 'SEG', long: 'Segunda' },
  tuesday: { short: 'TER', long: 'Terça' },
  wednesday: { short: 'QUA', long: 'Quarta' },
  thursday: { short: 'QUI', long: 'Quinta' },
  friday: { short: 'SEX', long: 'Sexta' },
  saturday: { short: 'SÁB', long: 'Sábado' },
  sunday: { short: 'DOM', long: 'Domingo' },
};

export type TreinosPlannedWorkout = {
  localId: string;
  templateId: string;
  template: PersonalWorkoutTemplate;
};

export type TreinosWeeklyBoard = Record<TreinosWeekday, TreinosPlannedWorkout[]>;

export type TreinosSelectedPatient = PacienteVisivelPersonal;

export function createEmptyWeeklyBoard(): TreinosWeeklyBoard {
  return {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  };
}

export function createPlannedWorkoutLocalId(): string {
  return `board_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function pacienteDisplayName(item: PacienteVisivelPersonal): string {
  return (
    item.paciente.dadosIdentificacao?.nomeCompleto ||
    item.paciente.nome ||
    'Paciente'
  );
}
