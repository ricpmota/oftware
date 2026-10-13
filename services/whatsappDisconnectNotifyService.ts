import { FieldValue } from 'firebase-admin/firestore';
import { sendEmail, isZeptoMailConfigured } from '@/lib/email/transporter';
import { METAADMIN_GERAL_EMAIL } from '@/lib/meta/anamneseInteligenteGate';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { withWhatsappProviderAuth } from '@/lib/server/whatsappSessionAuth.server';
import { CANAL_CHAT_OWNER_ID } from '@/lib/whatsapp/canalChatOwner';
import {
  markWhatsappSessionHealthy,
  registerWhatsappSessionTransientFailure,
} from '@/lib/whatsapp/whatsappSessionHealthGuard';
import {
  getWhatsappConnectionByDoctor,
  updateWhatsappConnectionStatus,
} from '@/services/whatsappConnectionService';
import { recheckProviderSessionHealth } from '@/services/whatsappProviderClient';
import type { WhatsappConnectionStatus } from '@/types/whatsappConnection';

const COLLECTION = 'whatsappConnections';
const NOTIFY_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const SESSION_BROKEN_MESSAGE =
  'WhatsApp aparenta conectado, mas o envio automático falhou. Clique em Conectar e escaneie o novo QR Code.';

function appOrigin(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    'https://www.oftware.com.br';
  const origin = base.startsWith('http') ? base : `https://${base}`;
  return origin.replace(/\/$/, '');
}

function metaadminWhatsappUrl(): string {
  return `${appOrigin()}/metaadmin`;
}

function canalChatWhatsappUrl(): string {
  return `${appOrigin()}/metaadmingeral?menu=automacoes-canal-chat`;
}

function isDisconnectedStatus(status: WhatsappConnectionStatus): boolean {
  return status === 'disconnected' || status === 'error';
}

async function resolveDoctorEmail(doctorId: string): Promise<{ email: string; nome: string } | null> {
  const snap = await getFirestoreAdmin().collection('medicos').doc(doctorId).get();
  if (!snap.exists) return null;
  const data = snap.data() as { email?: string; nome?: string };
  const email = data.email?.trim();
  if (!email) return null;
  const nome = data.nome?.trim() || 'Doutor(a)';
  return { email, nome };
}

async function markDisconnectEmailSent(doctorId: string): Promise<void> {
  await getFirestoreAdmin()
    .collection(COLLECTION)
    .doc(doctorId)
    .set(
      {
        lastDisconnectEmailAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

async function isDisconnectEmailOnCooldown(doctorId: string): Promise<boolean> {
  const snap = await getFirestoreAdmin().collection(COLLECTION).doc(doctorId).get();
  const data = snap.data() as { lastDisconnectEmailAt?: { toDate?: () => Date } } | undefined;
  const lastAt = data?.lastDisconnectEmailAt?.toDate?.();
  return Boolean(lastAt && Date.now() - lastAt.getTime() < NOTIFY_COOLDOWN_MS);
}

function isNotifyWorthyDisconnect(params: {
  previousStatus: WhatsappConnectionStatus;
  currentStatus: WhatsappConnectionStatus;
  reason: 'disconnected' | 'send_failed_while_connected';
}): boolean {
  const isDisconnectTransition =
    params.previousStatus === 'connected' && isDisconnectedStatus(params.currentStatus);
  const isSendFailureWhileConnected =
    params.reason === 'send_failed_while_connected' && isDisconnectedStatus(params.currentStatus);
  return isDisconnectTransition || isSendFailureWhileConnected;
}

/**
 * E-mail ao administrador geral quando o WhatsApp do Canal Chat cai.
 */
async function maybeNotifyCanalChatWhatsappDisconnected(params: {
  previousStatus: WhatsappConnectionStatus;
  currentStatus: WhatsappConnectionStatus;
  reason: 'disconnected' | 'send_failed_while_connected';
}): Promise<{ sent: boolean; reason?: string }> {
  if (!isNotifyWorthyDisconnect(params)) {
    return { sent: false, reason: 'not_a_disconnect_transition' };
  }

  if (!isZeptoMailConfigured()) {
    return { sent: false, reason: 'email_not_configured' };
  }

  if (await isDisconnectEmailOnCooldown(CANAL_CHAT_OWNER_ID)) {
    return { sent: false, reason: 'cooldown' };
  }

  const reconnectUrl = canalChatWhatsappUrl();
  const isZombie = params.reason === 'send_failed_while_connected';
  const to = METAADMIN_GERAL_EMAIL;

  const html = isZombie
    ? `
    <p>Olá.</p>
    <p>O WhatsApp do <strong>Canal Chat</strong> aparece conectado, mas um envio automático falhou.</p>
    <p>A sessão pode estar instável. Reconecte no metaadmingeral e escaneie um <strong>novo QR Code</strong>.</p>
    <p>Enquanto isso, cobranças, lembretes do calendário e envios que usam o Canal Chat ficam pausados.</p>
    <p><a href="${reconnectUrl}" style="display:inline-block;padding:12px 20px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Reconectar Canal Chat</a></p>
    <p style="color:#666;font-size:13px;">Se o botão não abrir, acesse: ${reconnectUrl}</p>
  `
    : `
    <p>Olá.</p>
    <p>O WhatsApp do <strong>Canal Chat</strong> desconectou na Oftware.</p>
    <p>Enquanto não reconectar, cobranças, lembretes do calendário e envios que usam o Canal Chat ficam pausados.</p>
    <p><a href="${reconnectUrl}" style="display:inline-block;padding:12px 20px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Reconectar Canal Chat</a></p>
    <p style="color:#666;font-size:13px;">Se o botão não abrir, acesse: ${reconnectUrl}</p>
  `;

  const sent = await sendEmail({
    to,
    subject: isZombie
      ? 'Canal Chat: WhatsApp precisa reconectar — envio automático falhou'
      : 'WhatsApp do Canal Chat desconectou',
    html,
    text: isZombie
      ? `O WhatsApp do Canal Chat aparece conectado, mas um envio automático falhou. Reconecte em: ${reconnectUrl}`
      : `O WhatsApp do Canal Chat desconectou. Reconecte em: ${reconnectUrl}`,
  });

  if (!sent.success) {
    console.warn('[whatsapp-disconnect-notify] canal chat e-mail falhou:', sent.error);
    return { sent: false, reason: sent.error };
  }

  await markDisconnectEmailSent(CANAL_CHAT_OWNER_ID);
  return { sent: true };
}

/**
 * Envia e-mail ao médico quando a sessão WhatsApp cai (com cooldown para evitar spam).
 * Canal Chat: e-mail vai para o administrador geral.
 */
export async function maybeNotifyDoctorWhatsappDisconnected(params: {
  doctorId: string;
  previousStatus: WhatsappConnectionStatus;
  currentStatus: WhatsappConnectionStatus;
  reason?: 'disconnected' | 'send_failed_while_connected';
}): Promise<{ sent: boolean; reason?: string }> {
  const { doctorId, previousStatus, currentStatus } = params;
  const reason = params.reason ?? 'disconnected';

  if (doctorId.trim() === CANAL_CHAT_OWNER_ID) {
    return maybeNotifyCanalChatWhatsappDisconnected({
      previousStatus,
      currentStatus,
      reason,
    });
  }

  if (!isNotifyWorthyDisconnect({ previousStatus, currentStatus, reason })) {
    return { sent: false, reason: 'not_a_disconnect_transition' };
  }

  if (!isZeptoMailConfigured()) {
    return { sent: false, reason: 'email_not_configured' };
  }

  if (await isDisconnectEmailOnCooldown(doctorId)) {
    return { sent: false, reason: 'cooldown' };
  }

  const doctor = await resolveDoctorEmail(doctorId);
  if (!doctor) {
    return { sent: false, reason: 'doctor_email_missing' };
  }

  const titulo = doctor.nome.startsWith('Dr') ? doctor.nome : `Dr(a). ${doctor.nome}`;
  const reconnectUrl = metaadminWhatsappUrl();
  const isZombie = reason === 'send_failed_while_connected';

  const html = isZombie
    ? `
    <p>Olá, ${titulo}.</p>
    <p>Detectamos que o WhatsApp do consultório <strong>aparece conectado, mas o envio automático falhou</strong>.</p>
    <p>Isso costuma acontecer quando a sessão fica “fantasma”: o sistema ainda marca como conectado, porém o WhatsApp no celular já não está respondendo.</p>
    <p>Para retomar os envios, conecte novamente e escaneie um <strong>novo QR Code</strong>.</p>
    <p><a href="${reconnectUrl}" style="display:inline-block;padding:12px 20px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Conectar WhatsApp</a></p>
    <p style="color:#666;font-size:13px;">Após conectar, você poderá reenviar as mensagens de hoje que não foram entregues.</p>
  `
    : `
    <p>Olá, ${titulo}.</p>
    <p>Detectamos que o <strong>WhatsApp do consultório foi desconectado</strong> na plataforma Oftware.</p>
    <p>Enquanto não conectar novamente, os envios automáticos (aplicações, lembretes e conclusão) ficam pausados.</p>
    <p><a href="${reconnectUrl}" style="display:inline-block;padding:12px 20px;background:#10b981;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Conectar WhatsApp</a></p>
    <p style="color:#666;font-size:13px;">Se o botão não abrir, acesse: ${reconnectUrl}</p>
    <p style="color:#666;font-size:13px;">Após conectar, você poderá reenviar as mensagens de hoje que não foram entregues.</p>
  `;

  const sent = await sendEmail({
    to: doctor.email,
    subject: isZombie
      ? 'WhatsApp precisa conectar novamente — envio automático falhou'
      : 'WhatsApp desconectado — conecte para retomar os envios automáticos',
    html,
    text: isZombie
      ? `Olá, ${titulo}. O WhatsApp parece conectado, mas o envio automático falhou. Conecte em: ${reconnectUrl}`
      : `Olá, ${titulo}. Seu WhatsApp foi desconectado na Oftware. Conecte em: ${reconnectUrl}`,
  });

  if (!sent.success) {
    console.warn('[whatsapp-disconnect-notify] falha ao enviar:', sent.error);
    return { sent: false, reason: sent.error };
  }

  await markDisconnectEmailSent(doctorId);
  return { sent: true };
}

/**
 * Quando um envio automático falha por saúde da sessão (status ainda "connected"),
 * revalida o WPPConnect antes de gravar `error`.
 *
 * TIMEOUT / SEND_UNCONFIRMED não devem chegar aqui — o caller já filtra.
 * 404/500 isolados não condenam a sessão: check-connection true preserva connected;
 * check falho só grava error após N strikes consecutivos.
 */
export async function flagWhatsappSessionBrokenFromSendFailure(params: {
  doctorId: string;
  errorMessage?: string;
  errorCode?: string;
  sessionId?: string;
}): Promise<{ flagged: boolean; emailSent: boolean }> {
  const doctorId = params.doctorId?.trim();
  if (!doctorId) return { flagged: false, emailSent: false };

  const errorMessage = params.errorMessage?.trim() || SESSION_BROKEN_MESSAGE;
  const errorCode = params.errorCode?.trim() || undefined;
  // Cinto de segurança: timeout/tempo esgotado nunca derruba sessão por este caminho.
  if (/tempo esgotado|timeout/i.test(errorMessage) || errorCode === 'TIMEOUT' || errorCode === 'SEND_UNCONFIRMED') {
    return { flagged: false, emailSent: false };
  }

  const existing = await getWhatsappConnectionByDoctor(doctorId);
  const previousStatus = existing?.status ?? 'disconnected';

  if (previousStatus !== 'connected' && previousStatus !== 'qr_pending') {
    return { flagged: false, emailSent: false };
  }

  const sessionId = params.sessionId?.trim() || existing?.sessionId?.trim() || '';

  let recheckHealthy = false;
  let rawStatus: string | undefined;
  let recheckCode: string | undefined = errorCode;

  if (sessionId) {
    try {
      const { result } = await withWhatsappProviderAuth(doctorId, sessionId, (token) =>
        recheckProviderSessionHealth(sessionId, token),
      );
      recheckHealthy = result.healthy;
      rawStatus = result.rawStatus;
      recheckCode = result.errorCode || errorCode;
    } catch (recheckError) {
      recheckHealthy = false;
      recheckCode =
        errorCode ||
        (recheckError instanceof Error && 'code' in recheckError
          ? String((recheckError as { code?: string }).code || '')
          : undefined) ||
        'RECHECK_FAILED';
      rawStatus = recheckCode;
    }
  }

  if (recheckHealthy) {
    const { previousStrikes } = markWhatsappSessionHealthy(doctorId);
    if (previousStrikes > 0) {
      console.info('[whatsapp.health] session recovered, strikes reset', {
        doctorId,
        sessionId,
        errorCode: errorCode || undefined,
        strike: 0,
        rawStatus: rawStatus || 'CONNECTED',
      });
    }
    console.info('[whatsapp.health] send failed but session recheck is healthy', {
      doctorId,
      sessionId,
      errorCode: errorCode || undefined,
      strike: 0,
      rawStatus: rawStatus || 'CONNECTED',
    });
    return { flagged: false, emailSent: false };
  }

  const { strike, threshold, shouldMarkError } = registerWhatsappSessionTransientFailure(doctorId);
  console.info(`[whatsapp.health] transient session failure strike ${strike}/${threshold}`, {
    doctorId,
    sessionId,
    errorCode: recheckCode || errorCode || undefined,
    strike,
    rawStatus: rawStatus || recheckCode || undefined,
  });

  if (!shouldMarkError) {
    return { flagged: false, emailSent: false };
  }

  console.info('[whatsapp.health] session marked error after confirmed failures', {
    doctorId,
    sessionId,
    errorCode: recheckCode || errorCode || undefined,
    strike,
    rawStatus: rawStatus || recheckCode || undefined,
  });

  await updateWhatsappConnectionStatus(doctorId, 'error', {
    sessionId: existing?.sessionId,
    organizationId: existing?.organizationId,
    errorMessage,
    lastCheckAt: new Date(),
  });

  markWhatsappSessionHealthy(doctorId);

  const notify = await maybeNotifyDoctorWhatsappDisconnected({
    doctorId,
    previousStatus: 'connected',
    currentStatus: 'error',
    reason: 'send_failed_while_connected',
  });

  return { flagged: true, emailSent: notify.sent };
}

/** Varre conexões ativas e notifica médicos cuja sessão caiu. */
export async function checkAllWhatsappConnectionsAndNotify(): Promise<{
  scanned: number;
  disconnected: number;
  emailsSent: number;
}> {
  const snapConnected = await getFirestoreAdmin()
    .collection(COLLECTION)
    .where('status', '==', 'connected')
    .get();
  const snapError = await getFirestoreAdmin()
    .collection(COLLECTION)
    .where('status', '==', 'error')
    .get();

  const docs = [...snapConnected.docs, ...snapError.docs];
  const seen = new Set<string>();

  let disconnected = 0;
  let emailsSent = 0;

  const { syncWhatsappConnectionWithProvider } = await import(
    '@/services/whatsappConnectionSyncService'
  );

  for (const doc of docs) {
    if (seen.has(doc.id)) continue;
    seen.add(doc.id);

    const connection = await getWhatsappConnectionByDoctor(doc.id);
    if (!connection) continue;
    if (connection.status !== 'connected' && connection.status !== 'error') continue;

    const { connection: after, previousStatus } = await syncWhatsappConnectionWithProvider(connection);
    if (after.status === 'connected') continue;
    if (previousStatus !== 'connected') continue;

    disconnected += 1;
    const notify = await maybeNotifyDoctorWhatsappDisconnected({
      doctorId: doc.id,
      previousStatus,
      currentStatus: after.status,
    });
    if (notify.sent) emailsSent += 1;
  }

  return { scanned: seen.size, disconnected, emailsSent };
}
