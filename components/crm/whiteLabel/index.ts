export { default as LeadsWhiteLabelCrmView } from '@/components/crm/whiteLabel/LeadsWhiteLabelCrmView';
export type { LeadsWhiteLabelCrmViewProps } from '@/components/crm/whiteLabel/LeadsWhiteLabelCrmView';
export type { CrmFiltersState } from '@/components/crm/whiteLabel/LeadsWhiteLabelCrmFilters';
export {
  WhiteLabelCrmProvider,
  useWhiteLabelCrmContext,
  useWhiteLabelCrmTheme,
} from '@/components/crm/whiteLabel/WhiteLabelCrmProvider';
export {
  getWhiteLabelCrmTheme,
  whiteLabelCrmVariantFromMetaadminHome,
  type WhiteLabelCrmThemeVariant,
} from '@/lib/crm/whiteLabelCrmTheme';
export {
  METAADMIN_GERAL_WHITELABEL_CRM_API,
  mergeWhiteLabelCrmApi,
  type WhiteLabelCrmApiConfig,
} from '@/lib/crm/whiteLabelCrmConfig';
