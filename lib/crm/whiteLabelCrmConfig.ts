export type WhiteLabelCrmApiConfig = {
  leads: string;
  timeline: (leadId: string) => string;
  crmAction: string;
  scheduleMeeting: string;
  availabilityList: string;
};

/** Rotas atuais do metaadmingeral — metaadmin reutilizará ou terá alias na etapa 2. */
export const METAADMIN_GERAL_WHITELABEL_CRM_API: WhiteLabelCrmApiConfig = {
  leads: '/api/metaadmingeral/leads-whitelabel',
  timeline: (leadId) =>
    `/api/metaadmingeral/leads-whitelabel/timeline?leadId=${encodeURIComponent(leadId)}`,
  crmAction: '/api/metaadmingeral/leads-whitelabel/crm/action',
  scheduleMeeting: '/api/metaadmingeral/whitelabel/schedule-meeting',
  availabilityList: '/api/metaadmingeral/whitelabel/availability/list',
};

export function mergeWhiteLabelCrmApi(
  partial?: Partial<WhiteLabelCrmApiConfig>
): WhiteLabelCrmApiConfig {
  return { ...METAADMIN_GERAL_WHITELABEL_CRM_API, ...partial };
}
