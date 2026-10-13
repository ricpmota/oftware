import { getDefaultOrganizationId } from '@/lib/organization/shadowOrganizationId';
import { getEmailAutomationEngine } from '@/services/emailAutomationEngineService';

/**
 * Ponto único de resolução do motor de e-mails automáticos.
 * ETAPA 2: cron send-automatic-emails consulta aqui antes de qualquer decisão.
 */
export async function resolveEmailAutomationEngine(
  organizationId?: string,
): Promise<'legacy' | 'queue' | 'shadow'> {
  return getEmailAutomationEngine(organizationId ?? getDefaultOrganizationId());
}

/** Alias explícito solicitado na governança de cutover. */
export { getEmailAutomationEngine };
