import { Timestamp } from 'firebase-admin/firestore';
import {
  AUTOMATION_ENGINE_LOG_PREFIX,
  createAutomationExecutionId,
  createAutomationRunId,
} from '@/lib/automation/executionId';
import {
  isOrganizationCircuitOpen,
  recordOrganizationFailure,
  recordOrganizationSuccess,
} from '@/lib/automation/circuitBreaker';
import { persistAutomationRunMetrics } from '@/lib/automation/executionMetrics';
import { cronEmailThrottle, getCronZeptoMaxSendsPerRun } from '@/lib/email/cronZeptoBatch';
import { zeptoEnvioFields } from '@/lib/email/emailEnvioLog';
import { sendEmail } from '@/lib/email/transporter';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type { EmailTipo } from '@/types/emailConfig';
import {
  claimQueueItemForProcessing,
  getPendingDueItemsForOrganization,
  markQueueItemFailed,
  markQueueItemSent,
  markQueueItemSkipped,
} from '@/services/emailAutomationQueueService';
import type { EmailAutomationQueueItem } from '@/types/emailAutomationQueue';

export type ProcessEmailQueueAutomationEngineResult = {
  automationRunId: string;
  organizationId: string;
  engine: 'queue';
  queueItemsRead: number;
  claimed: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  smtpErrors: number;
  firestoreReads: number;
  firestoreWrites: number;
  durationMs: number;
  avgSendLatencyMs: number;
  maxSendLatencyMs: number;
  emailsPerMinute: number;
  circuitOpen: boolean;
  automationDisabled: boolean;
  truncadoPorLimiteZepto: boolean;
  resultados: Array<{
    queueItemId: string;
    leadId: string;
    email: string;
    emailTipo: EmailTipo;
    automationExecutionId: string;
    outcome: 'sent' | 'failed' | 'skipped' | 'not_claimed';
    erro?: string;
    latencyMs?: number;
  }>;
};

type EmailTemplate = { assunto: string; corpoHtml: string };

function normalizeEmail(email: string | undefined | null): string {
  return (email ?? '').toLowerCase().trim();
}

async function loadConversionMaps(): Promise<{
  solicitacaoPorEmail: Map<string, unknown>;
  pacientesComMedico: Map<string, unknown>;
}> {
  const db = getFirestoreAdmin();
  const solicitacoesSnapshot = await db.collection('solicitacoes_medico').get();
  const solicitacaoPorEmail = new Map<string, unknown>();
  solicitacoesSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const email = normalizeEmail(data.pacienteEmail);
    if (email) solicitacaoPorEmail.set(email, data);
  });

  const pacientesSnapshot = await db.collection('pacientes_completos').get();
  const pacientesComMedico = new Map<string, unknown>();
  pacientesSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const email = normalizeEmail(data.email);
    if (email && data.medicoResponsavelId) pacientesComMedico.set(email, data);
  });

  return { solicitacaoPorEmail, pacientesComMedico };
}

function isLeadConverted(
  leadEmail: string,
  solicitacaoPorEmail: Map<string, unknown>,
  pacientesComMedico: Map<string, unknown>,
): boolean {
  const email = normalizeEmail(leadEmail);
  return solicitacaoPorEmail.has(email) || pacientesComMedico.has(email);
}

async function loadEmailTemplates(): Promise<Record<EmailTipo, EmailTemplate>> {
  const db = getFirestoreAdmin();
  const emailsCollection = db.collection('emails');
  const emailTypes: EmailTipo[] = ['email1', 'email2', 'email3', 'email4', 'email5'];
  const emails: Record<EmailTipo, EmailTemplate> = {
    email1: { assunto: '', corpoHtml: '' },
    email2: { assunto: '', corpoHtml: '' },
    email3: { assunto: '', corpoHtml: '' },
    email4: { assunto: '', corpoHtml: '' },
    email5: { assunto: '', corpoHtml: '' },
  };

  for (const emailTipo of emailTypes) {
    let emailDoc = await emailsCollection.doc(`leads_${emailTipo}`).get();
    if (!emailDoc.exists) {
      emailDoc = await emailsCollection.doc(emailTipo).get();
    }
    if (emailDoc.exists) {
      const data = emailDoc.data();
      emails[emailTipo] = {
        assunto: data?.assunto || '',
        corpoHtml: data?.corpoHtml || '',
      };
    }
  }

  return emails;
}

async function isOrganizationBlocked(organizationId: string): Promise<boolean> {
  const snap = await getFirestoreAdmin()
    .collection('automation_email_engine')
    .doc(organizationId)
    .get();
  const data = snap.data();
  return data?.blocked === true || data?.['automation.email.blocked'] === true;
}

function personalizeHtml(html: string, leadNome: string): string {
  const htmlPersonalizado = html.replace(/\{nome\}/g, leadNome || 'Cliente');
  if (htmlPersonalizado.includes('<html') || htmlPersonalizado.includes('<!DOCTYPE')) {
    return htmlPersonalizado;
  }
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  ${htmlPersonalizado}
</body>
</html>
  `.trim();
}

async function writeEmailEnvioLedger(params: {
  item: EmailAutomationQueueItem;
  template: EmailTemplate;
  agora: Date;
  success: boolean;
  automationExecutionId: string;
  automationRunId: string;
  erro?: string;
  messageId?: string;
}): Promise<void> {
  const db = getFirestoreAdmin();
  await db.collection('email_envios').add({
    leadId: params.item.leadId,
    leadEmail: params.item.leadEmail,
    leadNome: params.item.leadNome,
    emailTipo: params.item.emailTipo,
    assunto: params.template.assunto,
    enviadoEm: params.agora,
    status: params.success ? 'enviado' : 'falhou',
    tentativas: (params.item.retryCount ?? 0) + 1,
    erro: params.erro ?? null,
    tipo: 'automatico',
    organizationId: params.item.organizationId,
    automationExecutionId: params.automationExecutionId,
    automationRunId: params.automationRunId,
    queueItemId: params.item.id,
    engine: 'queue',
    ...zeptoEnvioFields(params.success ? params.messageId : null),
  });
}

function isSmtpError(code?: string): boolean {
  return code === 'EAUTH' || code === 'EENVELOPE' || code === 'ETIMEDOUT' || code === 'ESOCKETTIMEOUT';
}

/**
 * Automation Engine — canal e-mail (ETAPA 2).
 * Consome exclusivamente email_automation_queue (pending + scheduledFor <= now).
 * Não varre Auth nem consulta email_envios para elegibilidade.
 */
export async function processEmailQueueAutomationEngine(options: {
  organizationId: string;
  now?: Date;
  limit?: number;
}): Promise<ProcessEmailQueueAutomationEngineResult> {
  const startedAt = Date.now();
  const agora = options.now ?? new Date();
  const organizationId = options.organizationId.trim();
  const limit = options.limit ?? getCronZeptoMaxSendsPerRun();
  const automationRunId = createAutomationRunId({ channel: 'email', organizationId });

  let firestoreReads = 0;
  let firestoreWrites = 0;
  const sendLatencies: number[] = [];

  const emptyResult = (
    partial: Partial<ProcessEmailQueueAutomationEngineResult>,
  ): ProcessEmailQueueAutomationEngineResult => ({
    automationRunId,
    organizationId,
    engine: 'queue',
    queueItemsRead: 0,
    claimed: 0,
    sentCount: 0,
    skippedCount: 0,
    failedCount: 0,
    smtpErrors: 0,
    firestoreReads,
    firestoreWrites,
    durationMs: Date.now() - startedAt,
    avgSendLatencyMs: 0,
    maxSendLatencyMs: 0,
    emailsPerMinute: 0,
    circuitOpen: false,
    automationDisabled: false,
    truncadoPorLimiteZepto: false,
    resultados: [],
    ...partial,
  });

  if (await isOrganizationCircuitOpen(organizationId)) {
    console.log(`${AUTOMATION_ENGINE_LOG_PREFIX}[email][circuit_open]`, { organizationId, automationRunId });
    return emptyResult({ circuitOpen: true });
  }

  if (await isOrganizationBlocked(organizationId)) {
    console.log(`${AUTOMATION_ENGINE_LOG_PREFIX}[email][org_blocked]`, { organizationId, automationRunId });
    return emptyResult({ circuitOpen: true });
  }

  const configDoc = await getFirestoreAdmin().collection('emails').doc('config').get();
  firestoreReads += 1;
  if (!configDoc.exists || !configDoc.data()?.envioAutomatico?.ativo) {
    return emptyResult({ automationDisabled: true });
  }

  const items = await getPendingDueItemsForOrganization(organizationId, agora, limit);
  firestoreReads += 1;

  if (items.length === 0) {
    const result = emptyResult({});
    await persistRunMetrics(result, agora);
    return result;
  }

  const [conversionMaps, templates] = await Promise.all([loadConversionMaps(), loadEmailTemplates()]);
  firestoreReads += 2;

  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let smtpErrors = 0;
  let claimed = 0;
  const resultados: ProcessEmailQueueAutomationEngineResult['resultados'] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (i > 0 && sentCount + failedCount > 0) await cronEmailThrottle();

    const automationExecutionId = createAutomationExecutionId({
      channel: 'email',
      organizationId: item.organizationId,
      resourceId: item.leadId,
      actionType: item.emailTipo,
    });

    const claimResult = await claimQueueItemForProcessing(item.id, automationExecutionId, automationRunId);
    firestoreWrites += 1;

    if (claimResult !== 'claimed') {
      resultados.push({
        queueItemId: item.id,
        leadId: item.leadId,
        email: item.leadEmail,
        emailTipo: item.emailTipo,
        automationExecutionId,
        outcome: 'not_claimed',
      });
      continue;
    }
    claimed += 1;

    console.log(`${AUTOMATION_ENGINE_LOG_PREFIX}[email][processing]`, {
      automationExecutionId,
      automationRunId,
      organizationId: item.organizationId,
      leadId: item.leadId,
      emailTipo: item.emailTipo,
      timestamp: agora.toISOString(),
    });

    const skipAndContinue = async (reason: string) => {
      await markQueueItemSkipped(item.id, reason);
      firestoreWrites += 1;
      skippedCount += 1;
      resultados.push({
        queueItemId: item.id,
        leadId: item.leadId,
        email: item.leadEmail,
        emailTipo: item.emailTipo,
        automationExecutionId,
        outcome: 'skipped',
        erro: reason,
      });
    };

    if (isLeadConverted(item.leadEmail, conversionMaps.solicitacaoPorEmail, conversionMaps.pacientesComMedico)) {
      await skipAndContinue('Lead convertido (solicitação médico ou paciente com médico).');
      continue;
    }

    const template = templates[item.emailTipo];
    if (!template?.assunto || !template?.corpoHtml) {
      await skipAndContinue(`Template ${item.emailTipo} inexistente ou incompleto.`);
      continue;
    }

    const sendStart = Date.now();
    const htmlFinal = personalizeHtml(template.corpoHtml, item.leadNome);
    const textPlain = htmlFinal.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n');

    try {
      const sendResult = await sendEmail({
        to: item.leadEmail,
        subject: template.assunto,
        html: htmlFinal,
        text: textPlain,
        automationExecutionId,
      });

      const latencyMs = Date.now() - sendStart;
      sendLatencies.push(latencyMs);

      if (!sendResult.success) {
        const retryCount = (item.retryCount ?? 0) + 1;
        const erro =
          isSmtpError(sendResult.code) ?
            'Erro SMTP ZeptoMail. Verifique credenciais ou conectividade.'
          : sendResult.error;

        await markQueueItemFailed(item.id, erro, retryCount);
        firestoreWrites += 1;
        await writeEmailEnvioLedger({
          item,
          template,
          agora,
          success: false,
          automationExecutionId,
          automationRunId,
          erro,
        });
        firestoreWrites += 1;

        failedCount += 1;
        if (isSmtpError(sendResult.code)) smtpErrors += 1;

        await recordOrganizationFailure({
          organizationId,
          reason: erro,
          isSmtpError: isSmtpError(sendResult.code),
          latencyMs,
        });

        resultados.push({
          queueItemId: item.id,
          leadId: item.leadId,
          email: item.leadEmail,
          emailTipo: item.emailTipo,
          automationExecutionId,
          outcome: 'failed',
          erro,
          latencyMs,
        });
        continue;
      }

      await markQueueItemSent(item.id, {
        automationExecutionId,
        messageId: sendResult.messageId,
      });
      firestoreWrites += 1;
      await writeEmailEnvioLedger({
        item,
        template,
        agora,
        success: true,
        automationExecutionId,
        automationRunId,
        messageId: sendResult.messageId,
      });
      firestoreWrites += 1;

      sentCount += 1;
      await recordOrganizationSuccess(organizationId);

      resultados.push({
        queueItemId: item.id,
        leadId: item.leadId,
        email: item.leadEmail,
        emailTipo: item.emailTipo,
        automationExecutionId,
        outcome: 'sent',
        latencyMs,
      });
    } catch (error) {
      const latencyMs = Date.now() - sendStart;
      const erro = error instanceof Error ? error.message : 'Erro desconhecido ao enviar e-mail.';
      const retryCount = (item.retryCount ?? 0) + 1;
      const firestoreTrip = erro.toLowerCase().includes('firestore');

      await markQueueItemFailed(item.id, erro, retryCount);
      firestoreWrites += 1;
      await writeEmailEnvioLedger({
        item,
        template,
        agora,
        success: false,
        automationExecutionId,
        automationRunId,
        erro,
      }).catch(() => undefined);
      firestoreWrites += 1;

      failedCount += 1;
      await recordOrganizationFailure({
        organizationId,
        reason: erro,
        isSmtpError: false,
        latencyMs,
      });

      if (firestoreTrip) {
        console.error(`${AUTOMATION_ENGINE_LOG_PREFIX}[email][firestore_error]`, {
          automationExecutionId,
          organizationId,
          erro,
        });
      }

      resultados.push({
        queueItemId: item.id,
        leadId: item.leadId,
        email: item.leadEmail,
        emailTipo: item.emailTipo,
        automationExecutionId,
        outcome: 'failed',
        erro,
        latencyMs,
      });
    }
  }

  const durationMs = Date.now() - startedAt;
  const avgSendLatencyMs =
    sendLatencies.length > 0 ?
      sendLatencies.reduce((a, b) => a + b, 0) / sendLatencies.length
    : 0;
  const maxSendLatencyMs = sendLatencies.length > 0 ? Math.max(...sendLatencies) : 0;
  const emailsPerMinute = durationMs > 0 ? (sentCount / durationMs) * 60_000 : 0;

  const result: ProcessEmailQueueAutomationEngineResult = {
    automationRunId,
    organizationId,
    engine: 'queue',
    queueItemsRead: items.length,
    claimed,
    sentCount,
    skippedCount,
    failedCount,
    smtpErrors,
    firestoreReads,
    firestoreWrites,
    durationMs,
    avgSendLatencyMs,
    maxSendLatencyMs,
    emailsPerMinute,
    circuitOpen: false,
    automationDisabled: false,
    truncadoPorLimiteZepto: items.length >= limit,
    resultados,
  };

  console.log(`${AUTOMATION_ENGINE_LOG_PREFIX}[email][run_complete]`, JSON.stringify({
    automationRunId,
    organizationId,
    sentCount,
    failedCount,
    skippedCount,
    firestoreReads,
    firestoreWrites,
    durationMs,
    emailsPerMinute,
  }));

  await persistRunMetrics(result, agora);
  return result;
}

async function persistRunMetrics(
  result: ProcessEmailQueueAutomationEngineResult,
  agora: Date,
): Promise<void> {
  await persistAutomationRunMetrics({
    automationExecutionId: result.automationRunId,
    channel: 'email',
    organizationId: result.organizationId,
    engine: 'queue',
    startedAt: new Date(agora.getTime() - result.durationMs).toISOString(),
    finishedAt: agora.toISOString(),
    durationMs: result.durationMs,
    firestoreReads: result.firestoreReads,
    firestoreWrites: result.firestoreWrites,
    processed: result.claimed,
    sent: result.sentCount,
    failed: result.failedCount,
    skipped: result.skippedCount,
    smtpErrors: result.smtpErrors,
    avgSendLatencyMs: result.avgSendLatencyMs,
    maxSendLatencyMs: result.maxSendLatencyMs,
    emailsPerMinute: result.emailsPerMinute,
  });
}

/** Organizações com engine queue — cutover gradual multi-org. */
export async function listQueueEngineOrganizationIds(): Promise<string[]> {
  const snap = await getFirestoreAdmin().collection('automation_email_engine').get();
  const orgIds: string[] = [];
  snap.docs.forEach((doc) => {
    const engine = doc.data()?.['automation.email.engine'] ?? doc.data()?.engine;
    if (engine === 'queue') {
      orgIds.push(String(doc.data()?.organizationId ?? doc.id));
    }
  });
  return orgIds;
}
