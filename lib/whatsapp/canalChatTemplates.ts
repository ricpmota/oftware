/** Automações/templates gerenciados na página Canal Chat (metaadmingeral). */
export const CANAL_CHAT_TEMPLATE_AUTOMATION_IDS = [
  'cobranca_avulsa_whatsapp',
  'cobranca_automatica_whatsapp',
  'boas_vindas_paciente_whatsapp',
  'consulta_confirmacao_whatsapp',
  'consulta_lembrete_paciente_whatsapp',
  'consulta_lembrete_medico_whatsapp',
  'solicitacao_acompanhamento_whatsapp',
] as const;

export type CanalChatTemplateAutomationId =
  (typeof CANAL_CHAT_TEMPLATE_AUTOMATION_IDS)[number];

export const COBRANCA_AVULSA_AUTOMATION_ID = 'cobranca_avulsa_whatsapp';
export const COBRANCA_AUTOMATICA_AUTOMATION_ID = 'cobranca_automatica_whatsapp';
export const BOAS_VINDAS_PACIENTE_AUTOMATION_ID = 'boas_vindas_paciente_whatsapp';
export const CONSULTA_CONFIRMACAO_AUTOMATION_ID = 'consulta_confirmacao_whatsapp';
export const CONSULTA_LEMBRETE_PACIENTE_AUTOMATION_ID = 'consulta_lembrete_paciente_whatsapp';
export const CONSULTA_LEMBRETE_MEDICO_AUTOMATION_ID = 'consulta_lembrete_medico_whatsapp';
export const SOLICITACAO_ACOMPANHAMENTO_AUTOMATION_ID = 'solicitacao_acompanhamento_whatsapp';

/** Automações de aceite/consulta: disparo por evento, não por horário diário. */
export const MEDICO_EVENT_AUTOMATION_IDS = [
  BOAS_VINDAS_PACIENTE_AUTOMATION_ID,
  CONSULTA_CONFIRMACAO_AUTOMATION_ID,
  CONSULTA_LEMBRETE_PACIENTE_AUTOMATION_ID,
  CONSULTA_LEMBRETE_MEDICO_AUTOMATION_ID,
  SOLICITACAO_ACOMPANHAMENTO_AUTOMATION_ID,
] as const;

export function isCanalChatTemplateAutomationId(id: string): boolean {
  return (CANAL_CHAT_TEMPLATE_AUTOMATION_IDS as readonly string[]).includes(
    id as CanalChatTemplateAutomationId,
  );
}

export function isMedicoEventAutomationId(id: string): boolean {
  return (MEDICO_EVENT_AUTOMATION_IDS as readonly string[]).includes(
    id as (typeof MEDICO_EVENT_AUTOMATION_IDS)[number],
  );
}
