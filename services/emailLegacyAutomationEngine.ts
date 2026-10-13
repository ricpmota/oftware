import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { EmailTipo } from '@/types/emailConfig';
import { sendEmail } from '@/lib/email/transporter';
import {
  cronEmailThrottle,
  getCronZeptoMaxSendsPerRun,
} from '@/lib/email/cronZeptoBatch';
import { zeptoEnvioFields } from '@/lib/email/emailEnvioLog';
import {
  auditEmailEnviosQuery,
  EMAIL_ENVIOS_AUDIT_SITES,
} from '@/lib/auditoria/emailEnviosAudit';
import { leadBelongsToOrganization } from '@/lib/email/emailAutomationOrganizations';
import { createAutomationRunId, AUTOMATION_ENGINE_LOG_PREFIX } from '@/lib/automation/executionId';
import { persistAutomationRunMetrics } from '@/lib/automation/executionMetrics';
import { runShadowValidationForLegacyLeadsAptos } from '@/services/emailQueueShadowValidationService';
import type { EmailAutomationEngine } from '@/types/emailAutomationEngine';

const TIPOS_CAMPANHA_LEADS: EmailTipo[] = ['email1', 'email2', 'email3', 'email4', 'email5'];

export type EnvioCampanhaLead = {
  id: string;
  emailTipo: string;
  status: string;
  enviadoEm: Date;
};

export type LegacyLeadApto = {
  leadId: string;
  leadEmail: string;
  leadNome: string;
  dataCriacao: Date;
  proximoEmail?: EmailTipo;
  proximoEnvio?: Date;
};

export type LegacyEmailTemplates = Record<
  EmailTipo,
  {
    assunto: string;
    corpoHtml: string;
  }
>;

export type LegacyEmailSharedContext = {
  envioAutomaticoAtivo: boolean;
  emails: LegacyEmailTemplates;
  allFirebaseUsers: Array<{
    uid: string;
    email?: string;
    displayName?: string;
    customClaims?: Record<string, unknown>;
    metadata: { creationTime?: string };
  }>;
  solicitacaoPorEmail: Map<string, unknown>;
  pacientesComMedico: Map<string, unknown>;
  dataMinima: Date;
};

export type ProcessLegacyEmailEngineResult = {
  organizationId: string;
  engine: 'legacy' | 'shadow';
  status: 'completed' | 'skipped';
  sent: number;
  failed: number;
  skipped: number;
  readsEstimated: number;
  writesEstimated: number;
  durationMs: number;
  totalAptos: number;
  processadosNestaExecucao: number;
  emailEnviosQueries: number;
  emailEnviosDocsLidos: number;
  truncadoPorLimiteZepto: boolean;
  shadowValidation?: { compared: number; matches: number; mismatches: number };
};

export async function loadLegacyEmailSharedContext(
  db: Firestore,
  auth: Auth,
): Promise<LegacyEmailSharedContext> {
  const configDoc = await db.collection('emails').doc('config').get();
  const configData = configDoc.exists ? configDoc.data() : null;
  const envioAutomaticoAtivo = configData?.envioAutomatico?.ativo === true;

  const emailsCollection = db.collection('emails');
  const emailTypes: EmailTipo[] = ['email1', 'email2', 'email3', 'email4', 'email5'];
  const emails = {} as LegacyEmailTemplates;

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
    } else {
      emails[emailTipo] = { assunto: '', corpoHtml: '' };
    }
  }

  let allFirebaseUsers: LegacyEmailSharedContext['allFirebaseUsers'] = [];
  let nextPageToken: string | undefined;
  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    allFirebaseUsers = allFirebaseUsers.concat(
      listUsersResult.users.map((user) => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        customClaims: user.customClaims as Record<string, unknown> | undefined,
        metadata: { creationTime: user.metadata.creationTime },
      })),
    );
    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);

  const solicitacoesSnapshot = await db.collection('solicitacoes_medico').get();
  const solicitacaoPorEmail = new Map<string, unknown>();
  solicitacoesSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const email = data.pacienteEmail?.toLowerCase?.().trim();
    if (email) solicitacaoPorEmail.set(email, data);
  });

  const pacientesSnapshot = await db.collection('pacientes_completos').get();
  const pacientesComMedico = new Map<string, unknown>();
  pacientesSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const email = data.email?.toLowerCase?.().trim();
    if (email && data.medicoResponsavelId) pacientesComMedico.set(email, data);
  });

  const dataMinima = new Date('2025-11-20T00:00:00');
  dataMinima.setHours(0, 0, 0, 0);

  return {
    envioAutomaticoAtivo,
    emails,
    allFirebaseUsers,
    solicitacaoPorEmail,
    pacientesComMedico,
    dataMinima,
  };
}

export async function fetchEnviosCampanhaPorLead(
  db: Firestore,
  leadId: string,
  cache: Map<string, EnvioCampanhaLead[]>,
  auditScopeId?: string,
): Promise<EnvioCampanhaLead[]> {
  const cached = cache.get(leadId);
  if (cached) {
    auditEmailEnviosQuery({
      scopeId: auditScopeId,
      siteId: EMAIL_ENVIOS_AUDIT_SITES.CRON_SEND_AUTOMATIC_EMAILS.id,
      surface: 'cron',
      queryPattern: 'leadId_eq_emailTipo_in',
      leadId,
      emailTipos: TIPOS_CAMPANHA_LEADS,
      cacheHit: true,
      docsReturned: cached.length,
    });
    return cached;
  }

  auditEmailEnviosQuery({
    scopeId: auditScopeId,
    siteId: EMAIL_ENVIOS_AUDIT_SITES.CRON_SEND_AUTOMATIC_EMAILS.id,
    surface: 'cron',
    queryPattern: 'leadId_eq_emailTipo_in',
    leadId,
    emailTipos: TIPOS_CAMPANHA_LEADS,
    cacheHit: false,
  });

  const snapshot = await db
    .collection('email_envios')
    .where('leadId', '==', leadId)
    .where('emailTipo', 'in', TIPOS_CAMPANHA_LEADS)
    .get();

  auditEmailEnviosQuery({
    scopeId: auditScopeId,
    siteId: EMAIL_ENVIOS_AUDIT_SITES.CRON_SEND_AUTOMATIC_EMAILS.id,
    surface: 'cron',
    queryPattern: 'leadId_eq_emailTipo_in',
    leadId,
    emailTipos: TIPOS_CAMPANHA_LEADS,
    docsReturned: snapshot.size,
  });

  const envios = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      emailTipo: data.emailTipo,
      status: data.status,
      enviadoEm: data.enviadoEm?.toDate?.() ?? new Date(data.enviadoEm),
    };
  });
  cache.set(leadId, envios);
  return envios;
}

export function calcularProximoEmailCampanha(
  enviosDoLead: EnvioCampanhaLead[],
  createdAt: Date,
  agora: Date,
): { proximoEmail?: EmailTipo; proximoEnvio?: Date } {
  const horasDesdeCriacao = (agora.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  const email1Enviado = enviosDoLead.some((e) => e.emailTipo === 'email1' && e.status === 'enviado');
  const email2Enviado = enviosDoLead.some((e) => e.emailTipo === 'email2' && e.status === 'enviado');
  const email3Enviado = enviosDoLead.some((e) => e.emailTipo === 'email3' && e.status === 'enviado');
  const email4Enviado = enviosDoLead.some((e) => e.emailTipo === 'email4' && e.status === 'enviado');
  const email5Enviado = enviosDoLead.some((e) => e.emailTipo === 'email5' && e.status === 'enviado');

  let proximoEmail: EmailTipo | undefined;
  let proximoEnvio: Date | undefined;

  if (!email1Enviado && horasDesdeCriacao >= 1) {
    proximoEmail = 'email1';
    proximoEnvio = new Date(createdAt.getTime() + 60 * 60 * 1000);
  } else if (email1Enviado && !email2Enviado && horasDesdeCriacao >= 24) {
    proximoEmail = 'email2';
    proximoEnvio = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
  } else if (email2Enviado && !email3Enviado && horasDesdeCriacao >= 72) {
    proximoEmail = 'email3';
    proximoEnvio = new Date(createdAt.getTime() + 72 * 60 * 60 * 1000);
  } else if (email3Enviado && !email4Enviado && horasDesdeCriacao >= 168) {
    proximoEmail = 'email4';
    proximoEnvio = new Date(createdAt.getTime() + 168 * 60 * 60 * 1000);
  } else if (email4Enviado && !email5Enviado && horasDesdeCriacao >= 336) {
    proximoEmail = 'email5';
    proximoEnvio = new Date(createdAt.getTime() + 336 * 60 * 60 * 1000);
  }

  return { proximoEmail, proximoEnvio };
}

async function enviarEmailLegacy(
  leadEmail: string,
  leadNome: string,
  assunto: string,
  html: string,
): Promise<{ success: boolean; messageId?: string; erro?: string }> {
  const htmlPersonalizado = html.replace(/\{nome\}/g, leadNome || 'Cliente');

  let htmlFinal = htmlPersonalizado;
  if (!htmlFinal.includes('<html') && !htmlFinal.includes('<!DOCTYPE')) {
    htmlFinal = `
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

  const result = await sendEmail({
    to: leadEmail,
    subject: assunto,
    html: htmlFinal,
    text: htmlPersonalizado.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n\n'),
  });

  if (!result.success) {
    let erroFormatado = result.error;
    if (result.code === 'EAUTH' || result.code === 'EENVELOPE') {
      erroFormatado =
        'Erro de autenticação SMTP ZeptoMail. Verifique ZEPTOMAIL_SMTP_USER e ZEPTOMAIL_SMTP_PASSWORD.';
    } else if (result.code === 'ETIMEDOUT' || result.code === 'ESOCKETTIMEOUT') {
      erroFormatado = 'Tempo limite de conexão SMTP excedido.';
    }
    return { success: false, erro: erroFormatado };
  }

  return { success: true, messageId: result.messageId };
}

/** Motor legado por organização — mesmas regras do cron global, candidatos filtrados por org. */
export async function processLegacyEmailEngineForOrganization(params: {
  organizationId: string;
  engine: Extract<EmailAutomationEngine, 'legacy' | 'shadow'>;
  agora: Date;
  db: Firestore;
  shared: LegacyEmailSharedContext;
  auditScopeId?: string;
  enviosPorLeadCache?: Map<string, EnvioCampanhaLead[]>;
}): Promise<ProcessLegacyEmailEngineResult> {
  const startedAt = Date.now();
  const { organizationId, engine, agora, db, shared } = params;
  const enviosPorLeadCache = params.enviosPorLeadCache ?? new Map<string, EnvioCampanhaLead[]>();
  const limitePorExecucao = getCronZeptoMaxSendsPerRun();

  if (!shared.envioAutomaticoAtivo) {
    return {
      organizationId,
      engine,
      status: 'skipped',
      sent: 0,
      failed: 0,
      skipped: 0,
      readsEstimated: 0,
      writesEstimated: 0,
      durationMs: Date.now() - startedAt,
      totalAptos: 0,
      processadosNestaExecucao: 0,
      emailEnviosQueries: 0,
      emailEnviosDocsLidos: 0,
      truncadoPorLimiteZepto: false,
    };
  }

  const leadsAptos: LegacyLeadApto[] = [];
  let candidatosComTempoMinimo = 0;
  let docsEmailEnviosLidos = 0;

  for (const user of shared.allFirebaseUsers) {
    if (!leadBelongsToOrganization(user, organizationId)) continue;

    const userEmail = user.email?.toLowerCase().trim();
    if (!userEmail || userEmail === 'sem email') continue;
    if (shared.solicitacaoPorEmail.has(userEmail)) continue;
    if (shared.pacientesComMedico.has(userEmail)) continue;

    const createdAt = user.metadata.creationTime ? new Date(user.metadata.creationTime) : null;
    if (!createdAt) continue;
    const userCreatedAt = new Date(createdAt);
    userCreatedAt.setHours(0, 0, 0, 0);
    if (userCreatedAt < shared.dataMinima) continue;

    const horasDesdeCriacao = (agora.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    if (horasDesdeCriacao < 1) continue;

    candidatosComTempoMinimo++;
    const enviosDoLead = await fetchEnviosCampanhaPorLead(
      db,
      user.uid,
      enviosPorLeadCache,
      params.auditScopeId,
    );
    docsEmailEnviosLidos += enviosDoLead.length;

    const { proximoEmail, proximoEnvio } = calcularProximoEmailCampanha(enviosDoLead, createdAt, agora);

    if (proximoEmail && proximoEnvio && proximoEnvio <= agora) {
      leadsAptos.push({
        leadId: user.uid,
        leadEmail: user.email || '',
        leadNome: user.displayName || user.email || 'Usuário sem nome',
        dataCriacao: createdAt,
        proximoEmail,
        proximoEnvio,
      });
    }
  }

  if (candidatosComTempoMinimo === 0) {
    return {
      organizationId,
      engine,
      status: 'completed',
      sent: 0,
      failed: 0,
      skipped: 0,
      readsEstimated: 0,
      writesEstimated: 0,
      durationMs: Date.now() - startedAt,
      totalAptos: 0,
      processadosNestaExecucao: 0,
      emailEnviosQueries: enviosPorLeadCache.size,
      emailEnviosDocsLidos: 0,
      truncadoPorLimiteZepto: false,
    };
  }

  let shadowValidation: { compared: number; matches: number; mismatches: number } | undefined;
  if (engine === 'shadow') {
    try {
      shadowValidation = await runShadowValidationForLegacyLeadsAptos(leadsAptos, agora);
    } catch (shadowError) {
      console.error('[email_queue_shadow] erro no batch (ignorado):', shadowError);
    }
  }

  const fila = leadsAptos.slice(0, limitePorExecucao);
  const truncado = leadsAptos.length > fila.length;

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < fila.length; i++) {
    const lead = fila[i];
    if (i > 0) await cronEmailThrottle();
    if (!lead.proximoEmail) continue;

    const emailTemplate = shared.emails[lead.proximoEmail];
    if (!emailTemplate?.assunto || !emailTemplate?.corpoHtml) {
      failed++;
      continue;
    }

    const resultadoEnvio = await enviarEmailLegacy(
      lead.leadEmail,
      lead.leadNome,
      emailTemplate.assunto,
      emailTemplate.corpoHtml,
    );

    const envioRef = db.collection('email_envios').doc();
    await envioRef.set({
      leadId: lead.leadId,
      leadEmail: lead.leadEmail,
      leadNome: lead.leadNome,
      emailTipo: lead.proximoEmail,
      assunto: emailTemplate.assunto,
      enviadoEm: agora,
      status: resultadoEnvio.success ? 'enviado' : 'falhou',
      tentativas: 1,
      erro: resultadoEnvio.erro || null,
      tipo: 'automatico',
      ...zeptoEnvioFields(resultadoEnvio.success ? resultadoEnvio.messageId : null),
    });

    if (resultadoEnvio.success) sent++;
    else failed++;
  }

  const durationMs = Date.now() - startedAt;
  const readsEstimated = enviosPorLeadCache.size + fila.length;
  const writesEstimated = fila.length;

  const legacyRunId = createAutomationRunId({ channel: 'email', organizationId });
  await persistAutomationRunMetrics({
    automationExecutionId: legacyRunId,
    channel: 'email_legacy',
    organizationId,
    engine,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs,
    firestoreReads: readsEstimated,
    firestoreWrites: writesEstimated,
    processed: fila.length,
    sent,
    failed,
    skipped: 0,
    smtpErrors: failed,
    avgSendLatencyMs: 0,
    maxSendLatencyMs: 0,
    emailsPerMinute: durationMs > 0 ? (sent / durationMs) * 60_000 : 0,
  }).catch((metricsError) => {
    console.error(`${AUTOMATION_ENGINE_LOG_PREFIX}[legacy_metrics]`, metricsError);
  });

  return {
    organizationId,
    engine,
    status: 'completed',
    sent,
    failed,
    skipped: 0,
    readsEstimated,
    writesEstimated,
    durationMs,
    totalAptos: leadsAptos.length,
    processadosNestaExecucao: fila.length,
    emailEnviosQueries: enviosPorLeadCache.size,
    emailEnviosDocsLidos: docsEmailEnviosLidos,
    truncadoPorLimiteZepto: truncado,
    shadowValidation,
  };
}
