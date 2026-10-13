/**
 * Contagem conservadora de pacientes com sessão ativa na Central de Treinos.
 *
 * Decisão (ETAPA 1):
 * - Não usa o scan 2020–2030 da lista de Pacientes.
 * - Lê `trainingSessions` só na janela [hoje − 7 dias, hoje + 12 semanas].
 * - 12 semanas = máximo de `weeksCount` na UI atual de criar treino.
 * - Sessão conta se `active !== false` (mesmo critério do calendário / Hoje).
 * - Query indexada: patientId + scheduledDate (`getPatientSessionsInDateRange`).
 * - Sem escrita. Sem mudança de schema.
 */

import { trainingSessionService } from '@/services/trainingSessionService';
import { isTrainingSessionActive } from '@/lib/personal/trainingSessionActive';
import type { PacienteVisivelPersonal } from '@/services/pacientePersonalTrainerService';

export const TREINO_COVERAGE_PAST_DAYS = 7;
export const TREINO_COVERAGE_FUTURE_WEEKS = 12;
export const TREINO_COVERAGE_FUTURE_DAYS = TREINO_COVERAGE_FUTURE_WEEKS * 7;
export const TREINO_COVERAGE_BATCH_SIZE = 8;

export function treinoCoverageWindowLabel(): string {
  return `sessões ativas de ${TREINO_COVERAGE_PAST_DAYS} dias atrás até ${TREINO_COVERAGE_FUTURE_WEEKS} semanas à frente`;
}

function toLocalYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  next.setDate(next.getDate() + n);
  return next;
}

export function treinoCoverageDateRange(now = new Date()): { startDate: string; endDate: string } {
  return {
    startDate: toLocalYYYYMMDD(addDays(now, -TREINO_COVERAGE_PAST_DAYS)),
    endDate: toLocalYYYYMMDD(addDays(now, TREINO_COVERAGE_FUTURE_DAYS)),
  };
}

export function sessionLookupIds(paciente: { id?: string; userId?: string }): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const add = (value?: string) => {
    const id = String(value || '').trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };
  // userId provisório do cadastro é `{uidDeQuemCriou}_{timestamp}`.
  // O trecho antes do timestamp é outra pessoa, não um alias deste paciente.
  add(paciente.userId);
  add(paciente.id);
  return ids;
}

async function patientHasActiveSessionInWindow(
  paciente: { id?: string; userId?: string },
  startDate: string,
  endDate: string
): Promise<boolean> {
  for (const id of sessionLookupIds(paciente)) {
    try {
      const sessions = await trainingSessionService.getPatientSessionsInDateRange(
        id,
        startDate,
        endDate
      );
      if (sessions.some(isTrainingSessionActive)) return true;
    } catch {
      /* tenta o próximo identificador */
    }
  }
  return false;
}

export async function countPacientesComTreinoAtivo(
  pacientes: PacienteVisivelPersonal[],
  options?: { signal?: { cancelled: boolean } }
): Promise<{ comTreino: number; semTreino: number; idsComTreino: Set<string> }> {
  const { startDate, endDate } = treinoCoverageDateRange();
  const idsComTreino = new Set<string>();
  const list = pacientes.filter((item) => item.status === 'ativo');

  for (let i = 0; i < list.length; i += TREINO_COVERAGE_BATCH_SIZE) {
    if (options?.signal?.cancelled) {
      return { comTreino: 0, semTreino: 0, idsComTreino };
    }
    const batch = list.slice(i, i + TREINO_COVERAGE_BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (item) => ({
        pacienteId: item.pacienteId,
        has: await patientHasActiveSessionInWindow(item.paciente, startDate, endDate),
      }))
    );
    for (const row of results) {
      if (row.has) idsComTreino.add(row.pacienteId);
    }
  }

  const comTreino = idsComTreino.size;
  return {
    comTreino,
    semTreino: Math.max(0, list.length - comTreino),
    idsComTreino,
  };
}
