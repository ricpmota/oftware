/** Motor de automação de e-mails por organização (`automation.email.engine`). */
export type EmailAutomationEngine = 'legacy' | 'queue' | 'shadow';

export const EMAIL_AUTOMATION_ENGINE_DEFAULT: EmailAutomationEngine = 'legacy';

export const EMAIL_AUTOMATION_ENGINE_VALUES: EmailAutomationEngine[] = [
  'legacy',
  'shadow',
  'queue',
];

export interface EmailAutomationEngineSetting {
  organizationId: string;
  /** Campo persistido como automation.email.engine */
  engine: EmailAutomationEngine;
  updatedAt: string;
  updatedBy?: string;
}

export function isEmailAutomationEngine(value: unknown): value is EmailAutomationEngine {
  return (
    value === 'legacy' ||
    value === 'shadow' ||
    value === 'queue'
  );
}

export function buildEmailAutomationEngineDocId(organizationId: string): string {
  return organizationId.trim();
}
