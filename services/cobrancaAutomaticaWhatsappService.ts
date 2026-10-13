import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { withWhatsappProviderAuth } from '@/lib/server/whatsappSessionAuth.server';
import {
  DEFAULT_AUTO_APLICACAO_HORARIO,
  formatDateToBrasilDateKey,
  getBrasilDateTimeParts,
  horarioConfiguradoJaPassou,
  parseHorarioBrasil,
} from '@/lib/time/brasilTimezone';
import {
  CANAL_CHAT_OWNER_ID,
  CANAL_CHAT_SESSION_ID,
} from '@/lib/whatsapp/canalChatOwner';
import { COBRANCA_AUTOMATICA_AUTOMATION_ID } from '@/lib/whatsapp/canalChatTemplates';
import {
  renderCanalChatTemplate,
  resolveCanalChatAutomationTemplate,
} from '@/services/canalChatTemplateResolveService';
import { resolveMedicoTituloByDoctorId } from '@/lib/whatsapp/formatMedicoTitulo';
import {
  getAutomationDoctorSetting,
  listAllAutomationDoctorSettings,
} from '@/services/automationDoctorSettingsService';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import {
  registrarFinanceiroCobrancaEnvio,
} from '@/services/financeiroCobrancaEnvioService';
import { tryResolvePhoneFromPacienteDoc } from '@/lib/whatsapp/resolveInternationalPhone';
import {
  sendTestMessage,
  WhatsappProviderError,
} from '@/services/whatsappProviderClient';
import { flagWhatsappSessionBrokenFromSendFailure } from '@/services/whatsappDisconnectNotifyService';
import { isWhatsappSessionHealthFailure } from '@/lib/whatsapp/whatsappSessionHealth';
import { METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';

const PAGAMENTOS_COLLECTION = 'pagamentos_pacientes';
const PAGAMENTOS_NUTRI_COLLECTION = 'pagamentos_nutricionista_paciente';
const PAGAMENTOS_PERSONAL_COLLECTION = 'pagamentos_personal_trainer_paciente';
const PACIENTES_COLLECTION = 'pacientes_completos';
const ENVIOS_COLLECTION = 'cobranca_automatica_envios';

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === 'function') {
      try {
        return maybe.toDate();
      } catch {
        return undefined;
      }
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

function extrairTelefonePacienteDoc(data: Record<string, unknown>): string | null {
  return tryResolvePhoneFromPacienteDoc(data);
}

function extrairNomePaciente(data: Record<string, unknown>): string {
  const dadosIdentificacao = data.dadosIdentificacao as Record<string, unknown> | undefined;
  const nome =
    (typeof dadosIdentificacao?.nomeCompleto === 'string' && dadosIdentificacao.nomeCompleto.trim()) ||
    (typeof data.nome === 'string' && data.nome.trim()) ||
    '';
  return nome || 'paciente';
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || 'olá';
}

function formatMoneyBr(valor: number): string {
  return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDataBr(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

function buildEnvioId(params: {
  medicoId: string;
  pacienteId: string;
  dateKey: string;
  parcelaNumero: number;
}): string {
  return `${params.medicoId}_${params.pacienteId}_${params.dateKey}_p${params.parcelaNumero}`;
}

type DueParcela = {
  pacienteId: string;
  pacienteNome: string;
  phone: string;
  parcelaNumero: number;
  valor: number;
  dateKey: string;
  canalChatVerified: boolean;
};

async function listPacienteIdsForDoctor(medicoId: string): Promise<string[]> {
  const snap = await getFirestoreAdmin()
    .collection(PACIENTES_COLLECTION)
    .where('medicoResponsavelId', '==', medicoId)
    .select('medicoResponsavelId')
    .get();
  return snap.docs.map((doc) => doc.id);
}

async function listDueParcelasForDoctor(
  medicoId: string,
  dateKey: string,
): Promise<DueParcela[]> {
  const pacienteIds = await listPacienteIdsForDoctor(medicoId);
  if (pacienteIds.length === 0) return [];

  const results: DueParcela[] = [];
  const db = getFirestoreAdmin();

  for (let i = 0; i < pacienteIds.length; i += 25) {
    const chunk = pacienteIds.slice(i, i + 25);
    await Promise.all(
      chunk.map(async (pacienteId) => {
        const [pagSnap, pacSnap] = await Promise.all([
          db.collection(PAGAMENTOS_COLLECTION).doc(pacienteId).get(),
          db.collection(PACIENTES_COLLECTION).doc(pacienteId).get(),
        ]);
        if (!pagSnap.exists || !pacSnap.exists) return;

        const pacData = pacSnap.data() as Record<string, unknown>;
        const phone = extrairTelefonePacienteDoc(pacData);
        if (!phone) return;

        const pacienteNome = extrairNomePaciente(pacData);
        const data = pagSnap.data() as Record<string, unknown>;
        collectDueParcelasFromDoc({
          results,
          data,
          pacienteId,
          pacienteNome,
          phone,
          dateKey,
          canalChatVerified: pacData.canalChatVerified === true,
        });
      }),
    );
  }

  return results;
}

function collectDueParcelasFromDoc(params: {
  results: DueParcela[];
  data: Record<string, unknown>;
  pacienteId: string;
  pacienteNome: string;
  phone: string;
  dateKey: string;
  canalChatVerified: boolean;
}) {
  const parcelas = Array.isArray(params.data.parcelas) ? params.data.parcelas : [];
  for (const raw of parcelas) {
    if (!raw || typeof raw !== 'object') continue;
    const parcela = raw as Record<string, unknown>;
    if (parcela.status === 'paga') continue;

    const venc = toDate(parcela.dataVencimento);
    if (!venc) continue;
    if (formatDateToBrasilDateKey(venc) !== params.dateKey) continue;

    const valor = typeof parcela.valor === 'number' ? parcela.valor : Number(parcela.valor);
    if (!Number.isFinite(valor) || valor <= 0) continue;

    const numero =
      typeof parcela.numero === 'number'
        ? parcela.numero
        : Number.parseInt(String(parcela.numero ?? '0'), 10) || 0;

    params.results.push({
      pacienteId: params.pacienteId,
      pacienteNome: params.pacienteNome,
      phone: params.phone,
      parcelaNumero: numero,
      valor,
      dateKey: params.dateKey,
      canalChatVerified: params.canalChatVerified,
    });
  }
}

async function listDueParcelasForProfessional(
  ownerId: string,
  role: 'nutricionista' | 'personal_trainer',
  dateKey: string,
): Promise<DueParcela[]> {
  const id = ownerId.trim();
  if (!id) return [];

  const collectionName =
    role === 'nutricionista' ? PAGAMENTOS_NUTRI_COLLECTION : PAGAMENTOS_PERSONAL_COLLECTION;
  const ownerField = role === 'nutricionista' ? 'nutricionistaId' : 'personalTrainerId';

  const snap = await getFirestoreAdmin().collection(collectionName).where(ownerField, '==', id).get();
  if (snap.empty) return [];

  const results: DueParcela[] = [];
  const db = getFirestoreAdmin();

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const pacienteId =
      (typeof data.pacienteId === 'string' && data.pacienteId.trim()) ||
      (typeof data.pacienteIdRef === 'string' && data.pacienteIdRef.trim()) ||
      '';
    if (!pacienteId) continue;

    const pacSnap = await db.collection(PACIENTES_COLLECTION).doc(pacienteId).get();
    if (!pacSnap.exists) continue;
    const pacData = pacSnap.data() as Record<string, unknown>;
    const phone = extrairTelefonePacienteDoc(pacData);
    if (!phone) continue;

    collectDueParcelasFromDoc({
      results,
      data,
      pacienteId,
      pacienteNome: extrairNomePaciente(pacData),
      phone,
      dateKey,
      canalChatVerified: pacData.canalChatVerified === true,
    });
  }

  return results;
}

async function alreadySent(envioId: string): Promise<boolean> {
  const snap = await getFirestoreAdmin().collection(ENVIOS_COLLECTION).doc(envioId).get();
  return snap.exists && (snap.data() as { status?: string } | undefined)?.status === 'sent';
}

async function markEnvio(params: {
  envioId: string;
  medicoId: string;
  pacienteId: string;
  dateKey: string;
  parcelaNumero: number;
  valor: number;
  phone: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
}): Promise<void> {
  await getFirestoreAdmin()
    .collection(ENVIOS_COLLECTION)
    .doc(params.envioId)
    .set(
      {
        medicoId: params.medicoId,
        pacienteId: params.pacienteId,
        dateKey: params.dateKey,
        parcelaNumero: params.parcelaNumero,
        valor: params.valor,
        phone: params.phone,
        status: params.status,
        errorMessage: params.errorMessage ?? FieldValue.delete(),
        automationId: COBRANCA_AUTOMATICA_AUTOMATION_ID,
        updatedAt: FieldValue.serverTimestamp(),
        ...(params.status === 'sent' ? { sentAt: FieldValue.serverTimestamp() } : {}),
      },
      { merge: true },
    );
}

/**
 * Processa cobranças automáticas do dia (Canal Chat → paciente).
 */
export async function processDueCobrancaAutomaticaWhatsapp(options?: {
  now?: Date;
  limit?: number;
  doctorId?: string;
}): Promise<{
  doctors: number;
  scanned: number;
  sent: number;
  failed: number;
  skipped: number;
}> {
  const now = options?.now ?? new Date();
  const brasil = getBrasilDateTimeParts(now);
  const limit = Math.max(1, Math.min(options?.limit ?? 40, 100));

  const canalChat = await getWhatsappConnectionByDoctor(CANAL_CHAT_OWNER_ID);
  if (!canalChat || canalChat.status !== 'connected') {
    return { doctors: 0, scanned: 0, sent: 0, failed: 0, skipped: 0 };
  }
  const sessionId = canalChat.sessionId?.trim() || CANAL_CHAT_SESSION_ID;

  let doctorSettings = (await listAllAutomationDoctorSettings()).filter(
    (item) =>
      item.automationId === COBRANCA_AUTOMATICA_AUTOMATION_ID && item.enabled === true,
  );

  const doctorFilter = options?.doctorId?.trim();
  if (doctorFilter) {
    doctorSettings = doctorSettings.filter((item) => item.doctorId === doctorFilter);
  }

  let scanned = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const setting of doctorSettings) {
    if (sent + failed >= limit) break;

    const horario =
      parseHorarioBrasil(setting.horario ?? '') || DEFAULT_AUTO_APLICACAO_HORARIO;
    if (!horarioConfiguradoJaPassou(brasil.hhmm, horario)) {
      continue;
    }

    const organizationId = setting.organizationId?.trim() || METODO_ORGANIZATION_ID;
    const template = await resolveCanalChatAutomationTemplate({
      automationId: COBRANCA_AUTOMATICA_AUTOMATION_ID,
      organizationId,
    });

    const role = setting.professionalRole;
    const dues =
      role === 'nutricionista' || role === 'personal_trainer'
        ? await listDueParcelasForProfessional(setting.doctorId, role, brasil.dateKey)
        : await listDueParcelasForDoctor(setting.doctorId, brasil.dateKey);
    for (const due of dues) {
      if (sent + failed >= limit) break;
      scanned += 1;

      const envioId = buildEnvioId({
        medicoId: setting.doctorId,
        pacienteId: due.pacienteId,
        dateKey: due.dateKey,
        parcelaNumero: due.parcelaNumero,
      });

      if (await alreadySent(envioId)) {
        skipped += 1;
        continue;
      }

      const medicoTitulo = await resolveMedicoTituloByDoctorId(setting.doctorId);
      const message = template
        ? renderCanalChatTemplate(template.body, {
            nome: firstName(due.pacienteNome),
            valor: formatMoneyBr(due.valor),
            data: formatDataBr(due.dateKey),
            medico: medicoTitulo,
          })
        : [
            `Olá, ${firstName(due.pacienteNome)}!`,
            '',
            `Hoje (${formatDataBr(due.dateKey)}) vence a parcela do seu tratamento.`,
            `Valor da parcela: ${formatMoneyBr(due.valor)}`,
            '',
            `Para consultar seu relatório, contate o seu médico, ${medicoTitulo}.`,
          ].join('\n');

      try {
        await withWhatsappProviderAuth(CANAL_CHAT_OWNER_ID, sessionId, (token) =>
          sendTestMessage(sessionId, token, due.phone, message, {
            connectedPhone: canalChat.phone,
            phoneIsResolved: true,
          }),
        );

        await markEnvio({
          envioId,
          medicoId: setting.doctorId,
          pacienteId: due.pacienteId,
          dateKey: due.dateKey,
          parcelaNumero: due.parcelaNumero,
          valor: due.valor,
          phone: due.phone,
          status: 'sent',
        });

        try {
          await registrarWhatsappMessageLog({
            medicoId: setting.doctorId,
            type: 'cobranca_automatica',
            status: 'sent',
            phone: due.phone,
            message,
            pacienteId: due.pacienteId,
            pacienteNome: due.pacienteNome,
          });
        } catch (logError) {
          console.warn('[cobranca-automatica] log failed:', logError);
        }

        try {
          await registrarFinanceiroCobrancaEnvio({
            docId: `auto_${envioId}`,
            medicoId: setting.doctorId,
            pacienteId: due.pacienteId,
            pacienteNome: due.pacienteNome,
            organizationId,
            phone: due.phone,
            valorAberto: due.valor,
            tipo: 'automatica',
            status: 'sent',
          });
        } catch (envioError) {
          console.warn('[cobranca-automatica] canal-chat log failed:', envioError);
        }

        sent += 1;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erro ao enviar cobrança automática.';

        await markEnvio({
          envioId,
          medicoId: setting.doctorId,
          pacienteId: due.pacienteId,
          dateKey: due.dateKey,
          parcelaNumero: due.parcelaNumero,
          valor: due.valor,
          phone: due.phone,
          status: 'failed',
          errorMessage,
        });

        try {
          await registrarWhatsappMessageLog({
            medicoId: setting.doctorId,
            type: 'cobranca_automatica',
            status: 'failed',
            phone: due.phone,
            message,
            pacienteId: due.pacienteId,
            pacienteNome: due.pacienteNome,
            errorMessage,
          });
        } catch (logError) {
          console.warn('[cobranca-automatica] log failed:', logError);
        }

        try {
          await registrarFinanceiroCobrancaEnvio({
            docId: `auto_${envioId}`,
            medicoId: setting.doctorId,
            pacienteId: due.pacienteId,
            pacienteNome: due.pacienteNome,
            organizationId,
            phone: due.phone,
            valorAberto: due.valor,
            tipo: 'automatica',
            status: 'failed',
            errorMessage,
          });
        } catch (envioError) {
          console.warn('[cobranca-automatica] canal-chat log failed:', envioError);
        }

        if (isWhatsappSessionHealthFailure(error)) {
          await flagWhatsappSessionBrokenFromSendFailure({
            doctorId: CANAL_CHAT_OWNER_ID,
            errorMessage,
            errorCode: error instanceof WhatsappProviderError ? error.code : undefined,
          }).catch(() => undefined);
        }

        failed += 1;
      }
    }
  }

  return {
    doctors: doctorSettings.length,
    scanned,
    sent,
    failed,
    skipped,
  };
}

/** Útil para debug — força processamento de um médico. */
export async function processCobrancaAutomaticaForDoctor(doctorId: string) {
  const setting = await getAutomationDoctorSetting(doctorId, COBRANCA_AUTOMATICA_AUTOMATION_ID);
  if (!setting?.enabled) {
    return { ok: false as const, error: 'Cobrança automática desativada para este médico.' };
  }
  const result = await processDueCobrancaAutomaticaWhatsapp({ doctorId, limit: 50 });
  return { ok: true as const, ...result };
}
