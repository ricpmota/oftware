export type {
  ActiveOrganizationContext,
  GlobalAssetModule,
  OrganizationDefinition,
  OrganizationId,
  OrganizationKind,
  OrganizationTeam,
  TeamRole,
} from './organizationTypes';

export { TEAM_ROLES } from './organizationTypes';

export { GLOBAL_ASSET_MODULES, isGlobalAssetModule } from './globalAssetRegistry';

export {
  METODO_ORGANIZATION,
  METODO_ORGANIZATION_ID,
  buildActiveOrganizationContext,
  getDefaultOrganization,
  getOrganizationById,
  listOrganizations,
  organizationExists,
} from './organizationRegistry';

export {
  normalizeOrganizationHost,
  resolveOrganizationById,
  resolveOrganizationFromHost,
} from './resolveOrganizationFromHost';

export {
  ORGANIZACAO_METODO_PUBLIC_ORIGIN,
  buildOrganizacaoPublicUrl,
  buildOrganizationPublicUrl,
  buildPublicUrlForOrganization,
  resolveOrganizacaoPublicOrigin,
  resolveOrganizationPublicOrigin,
  resolvePublicOriginForOrganization,
} from './organizationUrls';

export {
  TEAM_MEMBER_COLLECTIONS,
  TEAM_SCOPE_RULE_ID,
  TEAM_SHARING_COLLECTIONS,
} from './organizationTeam';

export { getDefaultOrganizationId, shadowOrganizationFields } from './shadowOrganizationId';

export {
  readBrowserOrganizationHint,
  resolveOrganizationHintFromHost,
  resolvePatientOrganizationContext,
} from './patientOrganizationContext';
export type {
  DoctorOrganizationFields,
  PatientOrganizationContextValue,
  PatientOrganizationFields,
  PatientOrganizationHint,
  PatientOrganizationSource,
  PatientOrganizationStatus,
  ResolvePatientOrganizationContextInput,
} from './patientOrganizationContext';

export {
  fallbackPatientOrganizationBranding,
  mapSourceLayerToPatientBrandingSource,
  patientOrganizationBrandingLogPayload,
  resolvePatientOrganizationBrandingState,
  shouldFetchPatientOrganizationBranding,
  toPatientOrganizationBrandingPublic,
} from './patientOrganizationBranding';
export type {
  PatientOrganizationBrandingApiOk,
  PatientOrganizationBrandingPublic,
  PatientOrganizationBrandingSource,
  PatientOrganizationBrandingStatus,
  PatientOrganizationBrandingValue,
} from './patientOrganizationBranding';

export { metaUiBrandingCssVars, resolveMetaUiBranding } from './resolveMetaUiBranding';
export type { MetaUiBranding, MetaUiBrandingDivergence } from './resolveMetaUiBranding';

export type {
  OrganizationBrandingApiResponse,
  OrganizationBrandingInstagramBioDefaults,
  OrganizationBrandingPublicPageTheme,
  OrganizationBrandingPublicPages,
  OrganizationBrandingResolved,
  OrganizationBrandingSourceLayer,
  OrganizationBrandingStored,
} from './organizationBrandingTypes';
