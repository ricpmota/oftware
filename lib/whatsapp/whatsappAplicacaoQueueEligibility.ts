/**
 * Decisão de envio dos avisos de aplicação / injetável.
 * O cron deve recusar o item se o plano ou o status mudaram depois do enfileiramento.
 */

export type AplicacaoWhatsappQueueKind = 'aplicacao' | 'injetavel';

export type AplicacaoWhatsappQueueEligibilityInput = {
  kind: AplicacaoWhatsappQueueKind;
  statusTratamento: unknown;
  dateKey: string;
  aplicacaoWeek?: {
    isCancelada: boolean;
    temDoseAplicada: boolean;
    plannedDateKey: string;
  } | null;
  injetavelWeek?: {
    exists: boolean;
    realizado: boolean;
    plannedDateKey: string;
  } | null;
};

export type AplicacaoWhatsappQueueEligibility =
  | { send: true }
  | { send: false; reason: string };

export function patientStatusAllowsAplicacaoWhatsapp(status: unknown): boolean {
  return status === 'em_tratamento';
}

export function evaluateAplicacaoWhatsappQueueEligibility(
  input: AplicacaoWhatsappQueueEligibilityInput,
): AplicacaoWhatsappQueueEligibility {
  if (!patientStatusAllowsAplicacaoWhatsapp(input.statusTratamento)) {
    return { send: false, reason: 'Paciente não está em tratamento.' };
  }

  const dateKey = input.dateKey?.trim() ?? '';

  if (input.kind === 'injetavel') {
    const week = input.injetavelWeek;
    if (!week?.exists) {
      return { send: false, reason: 'Injetável removido do plano terapêutico.' };
    }
    if (week.realizado) {
      return { send: false, reason: 'Injetável já marcado como aplicado pelo médico.' };
    }
    if (!week.plannedDateKey) {
      return { send: false, reason: 'Injetável removido do plano terapêutico.' };
    }
    if (dateKey && week.plannedDateKey !== dateKey) {
      return { send: false, reason: 'Data do injetável foi alterada no plano terapêutico.' };
    }
    return { send: true };
  }

  const week = input.aplicacaoWeek;
  if (!week) {
    return { send: false, reason: 'Aplicação removida do plano terapêutico.' };
  }
  if (week.isCancelada) {
    return { send: false, reason: 'Aplicação cancelada no plano terapêutico.' };
  }
  if (week.temDoseAplicada) {
    return { send: false, reason: 'Aplicação já registrada pelo paciente.' };
  }
  if (!week.plannedDateKey) {
    return { send: false, reason: 'Aplicação removida do plano terapêutico.' };
  }
  if (dateKey && week.plannedDateKey !== dateKey) {
    return { send: false, reason: 'Data de aplicação foi alterada no plano terapêutico.' };
  }
  return { send: true };
}
