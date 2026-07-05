import type { MedicoWhiteLabelStored } from '@/types/medico';
import { applyMetodoImagensToWhiteLabel, type MetodoImagensTemplate } from '@/lib/metodo/metodoImagens';
import { applyOrganizationBrandingToWhiteLabelStored } from '@/lib/organization/organizationBrandingToWhiteLabel';
import type { OrganizationBrandingStored } from '@/lib/organization/organizationBrandingTypes';

/**
 * Mescla fontes white label na ordem crescente de prioridade (última vence):
 * medicos.whiteLabel → platformSettings/metodoImagens → organizations/metodo.branding
 */
export function mergeMedicoWhiteLabelSources(input: {
  whiteLabel?: MedicoWhiteLabelStored | null;
  metodoTemplate?: MetodoImagensTemplate | null;
  metodoImagensAtivo?: boolean;
  organizationBranding?: OrganizationBrandingStored | null;
  applyOrganizationLayer?: boolean;
}): MedicoWhiteLabelStored | undefined {
  let merged = applyMetodoImagensToWhiteLabel(
    input.whiteLabel,
    input.metodoTemplate,
    input.metodoImagensAtivo === true,
  );

  if (input.applyOrganizationLayer && input.organizationBranding) {
    merged = applyOrganizationBrandingToWhiteLabelStored(merged, input.organizationBranding);
  }

  return merged;
}
