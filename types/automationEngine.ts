/** Canal do Automation Engine — extensível para WhatsApp, Push, SMS, etc. */
export type AutomationEngineChannel =
  | 'email'
  | 'whatsapp'
  | 'push'
  | 'sms'
  | 'internal'
  | 'telegram'
  | 'webhook';

export type AutomationEngineRunMetrics = {
  automationExecutionId: string;
  channel: AutomationEngineChannel | string;
  organizationId: string;
  engine: 'legacy' | 'queue' | 'shadow';
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  firestoreReads: number;
  firestoreWrites: number;
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  smtpErrors: number;
  avgSendLatencyMs: number;
  maxSendLatencyMs: number;
  emailsPerMinute: number;
};

export type AutomationEngineComparisonSnapshot = {
  motor: 'legacy' | 'queue';
  firestoreReads: number;
  firestoreWrites: number;
  durationMs: number;
  processed: number;
};
