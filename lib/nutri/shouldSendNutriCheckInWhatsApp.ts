import {
  isNutritionCheckInScheduledDateEligible,
  type NutritionTreatmentWindow,
} from '@/lib/nutri/checkInSemanalNutriTreatmentEligibility';

export type NutriCheckInWhatsAppSendDecision = {
  send: boolean;
  skipReason?: string;
};

/**
 * Revalidação pura no momento do envio (D0 ou atraso 24h).
 * Não confia na decisão de quando o item entrou na fila.
 */
export function shouldSendNutriCheckInWhatsApp(input: {
  globalAutomationEnabled: boolean;
  scheduleEnabled: boolean;
  hasActiveVinculo: boolean;
  statusTratamento?: string | null;
  window: NutritionTreatmentWindow | null;
  scheduledDate: string;
  hasClinicalRecord: boolean;
  hasPhone: boolean;
}): NutriCheckInWhatsAppSendDecision {
  if (!input.globalAutomationEnabled) {
    return { send: false, skipReason: 'Automação global do nutricionista desativada.' };
  }
  if (!input.scheduleEnabled) {
    return { send: false, skipReason: 'Cronograma do Check-in Semanal desativado.' };
  }
  if (!input.hasActiveVinculo) {
    return { send: false, skipReason: 'Vínculo nutricionista–paciente inativo.' };
  }
  if (input.hasClinicalRecord) {
    return { send: false, skipReason: 'Check-in Semanal já respondido.' };
  }
  if (
    !isNutritionCheckInScheduledDateEligible({
      statusTratamento: input.statusTratamento,
      window: input.window,
      scheduledDate: input.scheduledDate,
    })
  ) {
    return { send: false, skipReason: 'Paciente fora do tratamento ou da vigência.' };
  }
  if (!input.hasPhone) {
    return { send: false, skipReason: 'Paciente sem telefone válido.' };
  }
  return { send: true };
}
