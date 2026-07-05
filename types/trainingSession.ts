/**
 * Tipos para sessões de treino (Training Sessions)
 * Conforme especificação: oftware_meta_paciente_personal_spec_v1.md
 */

export type TrainingSessionStatus = 'scheduled' | 'done' | 'skipped';

export interface TrainingSessionExercise {
  id?: string; // ID do documento Firestore (para deletar)
  source: 'exercisedb';
  exerciseId: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl?: string;
  prescription: {
    sets: number;
    reps: number;
    restSec: number;
  };
  order: number;
  status?: 'done' | 'skipped'; // Status individual do exercício
  completedAt?: Date | string; // Data/hora que foi marcado como feito/pulou
}

export interface TrainingSession {
  id?: string;
  patientId: string;
  createdBy: 'patient' | 'trainer';
  createdById: string;
  scheduledDate: string; // YYYY-MM-DD
  title: string;
  status: TrainingSessionStatus;
  patientNotes?: string;
  trainerNotes?: string;
  published: boolean;
  recurrenceGroupId?: string;
  updatedAt: Date | string;
  createdAt: Date | string;
  revision?: number;
}

export interface TrainingReminderPrefs {
  enabled: boolean;
  time: string; // HH:mm
  daysOfWeek: number[]; // 0 = domingo, 6 = sábado
  channel?: string;
  updatedAt: Date | string;
}
