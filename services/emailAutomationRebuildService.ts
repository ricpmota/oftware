import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getDefaultOrganizationId } from '@/lib/organization/shadowOrganizationId';
import {
  LEADS_MEDICO_DATA_MINIMA,
  LEADS_MEDICO_EMAIL_SEQUENCE,
  scheduledForLeadsMedicoEmail,
} from '@/lib/email/leadsMedicoEmailSchedule';
import {
  fetchEnviosCampanhaPorLeadIds,
  type EnvioCampanhaLead,
} from '@/lib/leadsEmailStatus/fetchEnviosCampanhaPorLeadIds';
import {
  enqueueLeadSequence,
  listQueueItemsByLead,
  markQueueItemSkipped,
} from '@/services/emailAutomationQueueService';
import type { EmailTipo } from '@/types/emailConfig';
import type { LeadsMedicoQueuedEmailTipo } from '@/types/emailAutomationQueue';

export type RebuildEmailQueueResult = {
  organizationId: string;
  leadsScanned: number;
  leadsEligible: number;
  leadsIneligible: number;
  enqueued: number;
  updated: number;
  skippedExisting: number;
  skippedConversion: number;
};

export type RebuildLeadEmailQueueResult = {
  leadId: string;
  eligible: boolean;
  enqueued: number;
  updated: number;
  skippedExisting: number;
  reason?: string;
};

export type RebuildDoctorEmailQueueResult = {
  doctorId: string;
  leadIdsTouched: number;
  pendingSkipped: number;
};

type LeadCandidate = {
  leadId: string;
  leadEmail: string;
  leadNome: string;
  createdAt: Date;
};

function normalizeEmail(email: string | undefined | null): string {
  return (email ?? '').toLowerCase().trim();
}

function isEligibleEmail(email: string): boolean {
  return !!email && email !== 'sem email';
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
  return solicitacaoPorEmail.has(leadEmail) || pacientesComMedico.has(leadEmail);
}

function buildScheduleForLead(params: {
  createdAt: Date;
  enviosDoLead: EnvioCampanhaLead[];
  converted: boolean;
}): Array<{
  emailTipo: LeadsMedicoQueuedEmailTipo;
  scheduledFor: Date;
  initialStatus?: 'pending' | 'sent' | 'skipped';
  sentAt?: Date;
  errorMessage?: string;
}> {
  const envioPorTipo = new Map<EmailTipo, EnvioCampanhaLead>();
  for (const envio of params.enviosDoLead) {
    const tipo = envio.emailTipo as EmailTipo;
    if (!LEADS_MEDICO_EMAIL_SEQUENCE.includes(tipo)) continue;
    const prev = envioPorTipo.get(tipo);
    if (!prev || envio.enviadoEm.getTime() > prev.enviadoEm.getTime()) {
      envioPorTipo.set(tipo, envio);
    }
  }

  return LEADS_MEDICO_EMAIL_SEQUENCE.map((emailTipo) => {
    const scheduledFor = scheduledForLeadsMedicoEmail(params.createdAt, emailTipo);
    const envio = envioPorTipo.get(emailTipo);

    if (params.converted) {
      return {
        emailTipo,
        scheduledFor,
        initialStatus: 'skipped' as const,
        errorMessage: 'Lead convertido (solicitação médico ou paciente com médico).',
      };
    }

    if (envio?.status === 'enviado') {
      return {
        emailTipo,
        scheduledFor,
        initialStatus: 'sent' as const,
        sentAt: envio.enviadoEm,
      };
    }

    return { emailTipo, scheduledFor, initialStatus: 'pending' as const };
  });
}

async function listAuthLeadCandidates(): Promise<LeadCandidate[]> {
  const auth = getAuthAdmin();
  let allUsers: Awaited<ReturnType<typeof auth.listUsers>>['users'] = [];
  let nextPageToken: string | undefined;

  do {
    const page = await auth.listUsers(1000, nextPageToken);
    allUsers = allUsers.concat(page.users);
    nextPageToken = page.pageToken;
  } while (nextPageToken);

  const dataMinima = new Date(LEADS_MEDICO_DATA_MINIMA);
  dataMinima.setHours(0, 0, 0, 0);

  const candidates: LeadCandidate[] = [];
  for (const user of allUsers) {
    const leadEmail = normalizeEmail(user.email);
    if (!isEligibleEmail(leadEmail)) continue;

    const createdAt = user.metadata.creationTime ? new Date(user.metadata.creationTime) : null;
    if (!createdAt) continue;

    const userCreatedAt = new Date(createdAt);
    userCreatedAt.setHours(0, 0, 0, 0);
    if (userCreatedAt < dataMinima) continue;

    candidates.push({
      leadId: user.uid,
      leadEmail: user.email ?? '',
      leadNome: user.displayName || user.email || 'Usuário sem nome',
      createdAt,
    });
  }

  return candidates;
}

async function materializeQueueForLead(params: {
  organizationId: string;
  lead: LeadCandidate;
  converted: boolean;
  enviosDoLead: EnvioCampanhaLead[];
}): Promise<{ enqueued: number; updated: number; skippedExisting: number }> {
  const schedule = buildScheduleForLead({
    createdAt: params.lead.createdAt,
    enviosDoLead: params.enviosDoLead,
    converted: params.converted,
  });

  return enqueueLeadSequence({
    organizationId: params.organizationId,
    leadId: params.lead.leadId,
    leadNome: params.lead.leadNome,
    leadEmail: params.lead.leadEmail,
    createdAt: params.lead.createdAt,
    schedule,
  });
}

/**
 * Reconstrói a fila para todos os leads elegíveis da organização.
 * Varredura pesada — apenas rebuild diário / admin / shadow mode.
 * NÃO envia e-mails.
 */
export async function rebuildEmailAutomationQueueForOrganization(
  organizationId?: string,
): Promise<RebuildEmailQueueResult> {
  const orgId = organizationId?.trim() || getDefaultOrganizationId();
  const db = getFirestoreAdmin();

  const candidates = await listAuthLeadCandidates();
  const { solicitacaoPorEmail, pacientesComMedico } = await loadConversionMaps();

  const leadIds = candidates.map((c) => c.leadId);
  const { enviosPorLead } = await fetchEnviosCampanhaPorLeadIds(db, leadIds);

  let leadsEligible = 0;
  let leadsIneligible = 0;
  let enqueued = 0;
  let updated = 0;
  let skippedExisting = 0;
  let skippedConversion = 0;

  for (const lead of candidates) {
    const emailKey = normalizeEmail(lead.leadEmail);
    const converted = isLeadConverted(emailKey, solicitacaoPorEmail, pacientesComMedico);
    if (converted) {
      leadsIneligible += 1;
      skippedConversion += 1;
    } else {
      leadsEligible += 1;
    }

    const result = await materializeQueueForLead({
      organizationId: orgId,
      lead,
      converted,
      enviosDoLead: enviosPorLead.get(lead.leadId) ?? [],
    });

    enqueued += result.enqueued;
    updated += result.updated;
    skippedExisting += result.skippedExisting;
  }

  return {
    organizationId: orgId,
    leadsScanned: candidates.length,
    leadsEligible,
    leadsIneligible,
    enqueued,
    updated,
    skippedExisting,
    skippedConversion,
  };
}

/**
 * Reconstrói a fila de UM lead (gatilho leve).
 * NÃO envia e-mails.
 */
export async function rebuildEmailAutomationQueueForLead(
  leadId: string,
  organizationId?: string,
): Promise<RebuildLeadEmailQueueResult> {
  const lid = leadId?.trim();
  const orgId = organizationId?.trim() || getDefaultOrganizationId();
  if (!lid) {
    return { leadId: '', eligible: false, enqueued: 0, updated: 0, skippedExisting: 0, reason: 'leadId vazio' };
  }

  const auth = getAuthAdmin();
  let user;
  try {
    user = await auth.getUser(lid);
  } catch {
    return {
      leadId: lid,
      eligible: false,
      enqueued: 0,
      updated: 0,
      skippedExisting: 0,
      reason: 'Lead não encontrado no Firebase Auth.',
    };
  }

  const leadEmail = normalizeEmail(user.email);
  if (!isEligibleEmail(leadEmail)) {
    return {
      leadId: lid,
      eligible: false,
      enqueued: 0,
      updated: 0,
      skippedExisting: 0,
      reason: 'E-mail inválido.',
    };
  }

  const createdAt = user.metadata.creationTime ? new Date(user.metadata.creationTime) : null;
  if (!createdAt) {
    return {
      leadId: lid,
      eligible: false,
      enqueued: 0,
      updated: 0,
      skippedExisting: 0,
      reason: 'Sem data de criação.',
    };
  }

  const dataMinima = new Date(LEADS_MEDICO_DATA_MINIMA);
  dataMinima.setHours(0, 0, 0, 0);
  const userCreatedAt = new Date(createdAt);
  userCreatedAt.setHours(0, 0, 0, 0);
  if (userCreatedAt < dataMinima) {
    return {
      leadId: lid,
      eligible: false,
      enqueued: 0,
      updated: 0,
      skippedExisting: 0,
      reason: 'Cadastro anterior à data mínima da campanha.',
    };
  }

  const { solicitacaoPorEmail, pacientesComMedico } = await loadConversionMaps();
  const converted = isLeadConverted(leadEmail, solicitacaoPorEmail, pacientesComMedico);

  const db = getFirestoreAdmin();
  const { enviosPorLead } = await fetchEnviosCampanhaPorLeadIds(db, [lid]);

  const lead: LeadCandidate = {
    leadId: lid,
    leadEmail: user.email ?? '',
    leadNome: user.displayName || user.email || 'Usuário sem nome',
    createdAt,
  };

  const result = await materializeQueueForLead({
    organizationId: orgId,
    lead,
    converted,
    enviosDoLead: enviosPorLead.get(lid) ?? [],
  });

  return {
    leadId: lid,
    eligible: !converted,
    enqueued: result.enqueued,
    updated: result.updated,
    skippedExisting: result.skippedExisting,
    reason: converted ? 'Lead convertido.' : undefined,
  };
}

/**
 * Manutenção por médico: marca como skipped os itens pending de leads
 * convertidos para este médico (solicitação ou paciente_completo).
 * NÃO envia e-mails.
 */
export async function rebuildEmailAutomationQueueForDoctor(
  doctorId: string,
): Promise<RebuildDoctorEmailQueueResult> {
  const did = doctorId?.trim();
  if (!did) return { doctorId: '', leadIdsTouched: 0, pendingSkipped: 0 };

  const db = getFirestoreAdmin();
  const leadIds = new Set<string>();

  const solicitacoes = await db.collection('solicitacoes_medico').where('medicoId', '==', did).get();
  solicitacoes.docs.forEach((doc) => {
    const data = doc.data();
    const pacienteId = String(data.pacienteId ?? '').trim();
    if (pacienteId) leadIds.add(pacienteId);
  });

  const pacientes = await db.collection('pacientes_completos').where('medicoResponsavelId', '==', did).get();
  pacientes.docs.forEach((doc) => {
    const data = doc.data();
    const userId = String(data.userId ?? '').trim();
    if (userId) leadIds.add(userId);
    else leadIds.add(doc.id);
  });

  let pendingSkipped = 0;
  for (const leadId of leadIds) {
    const items = await listQueueItemsByLead(leadId);
    for (const item of items) {
      if (item.status !== 'pending') continue;
      await markQueueItemSkipped(item.id, 'Lead convertido para este médico.');
      pendingSkipped += 1;
    }
  }

  return { doctorId: did, leadIdsTouched: leadIds.size, pendingSkipped };
}
