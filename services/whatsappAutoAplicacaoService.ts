import { Timestamp } from 'firebase-admin/firestore';
import { buildAplicacaoWhatsAppMessage, primeiroNomePaciente } from '@/lib/aplicacao/buildAplicacaoWhatsAppMessage';
import { ensureAplicacaoPublicUrl } from '@/lib/aplicacao/ensureAplicacaoPublicLink';
import { normalizePacienteDocument } from '@/lib/oi/normalizePacienteFirestore';
import { getBrasilDateTimeParts, horarioConfiguradoJaPassou } from '@/lib/time/brasilTimezone';
import {
  isDoctorAutoAplicacaoDiaAuthorized,
  syncLegacyAutoAplicacaoFromDoctorSettings,
} from '@/lib/whatsapp/autoAplicacaoAuthorization.server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  getWhatsappConnectionByDoctor,
  touchWhatsappAutoAplicacaoUltimoEnvio,
} from '@/services/whatsappConnectionService';
import { tryResolvePhoneFromPacienteDoc } from '@/lib/whatsapp/resolveInternationalPhone';
import { sendPatientAutomationWhatsapp } from '@/services/whatsappPatientSendRouter';
import type { PacienteCompleto } from '@/types/obesidade';
import type { WhatsappAutoAplicacaoEnvio, WhatsappAutoAplicacaoEnvioStatus } from '@/types/whatsappAutoAplicacao';
import {
  buildWhatsappAutoAplicacaoEnvioId,
  buildWhatsappAutoAplicacaoEnvioKey,
} from '@/types/whatsappAutoAplicacao';
import type {
  AutoAplicacaoPainelItem,
  AutoAplicacaoPainelItemStatus,
} from '@/types/whatsappAutoAplicacao';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import { getWhatsappCronHeartbeat, type WhatsappCronHeartbeat } from '@/services/whatsappCronHeartbeatService';
import { listarAplicacoesPlanejadasNoDia } from '@/utils/esquemaDosesSemana';

const ENVIOS_COLLECTION = 'whatsapp_auto_aplicacao_envios';
const AUTO_SEND_GAP_MS = 60_000;

export type AutoAplicacaoDiagnostico = {
  brasil: ReturnType<typeof getBrasilDateTimeParts>;
  autoAplicacaoEnabled: boolean;
  whatsappConnected: boolean;
  horarioConfigurado: string;
  envioLiberado: boolean;
  aplicacoesHoje: number;
  pendentesEnvio: number;
  semTelefone: Array<{ pacienteId: string; pacienteNome: string; semana: number }>;
  proximosPendentes: Array<{ pacienteNome: string; semana: number; dose: number; telefone: string }>;
  bloqueios: string[];
};

export type AplicacaoPendenteAutoEnvio = {
  pacienteId: string;
  pacienteNome: string;
  telefone: string;
  data: string;
  semana: number;
  dose: number;
  ehHoje: boolean;
};

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === 'function') return maybe.toDate();
  }
  return undefined;
}

function docToEnvio(docId: string, data: Record<string, unknown>): WhatsappAutoAplicacaoEnvio {
  return {
    id: docId,
    medicoId: String(data.medicoId ?? ''),
    pacienteId: String(data.pacienteId ?? ''),
    data: String(data.data ?? ''),
    semana: Number(data.semana ?? 0),
    dose: Number(data.dose ?? 0),
    status: (data.status as WhatsappAutoAplicacaoEnvioStatus) ?? 'failed',
    sentAt: toDate(data.sentAt) ?? new Date(),
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : undefined,
  };
}

function extrairTelefonePaciente(data: Record<string, unknown>): string | null {
  return tryResolvePhoneFromPacienteDoc(data);
}

function pacienteElegivelCalendario(status: unknown): boolean {
  return status === 'em_tratamento' || status === 'concluido';
}

function pacienteFromFirestore(docId: string, raw: Record<string, unknown>): PacienteCompleto {
  return normalizePacienteDocument(docId, raw) as unknown as PacienteCompleto;
}

function listarAplicacoesDoDiaPaciente(
  paciente: PacienteCompleto,
  dateKey: string,
): Array<{ semana: number; dose: number }> {
  return listarAplicacoesPlanejadasNoDia(paciente, dateKey).map((aplicacao) => ({
    semana: aplicacao.semana,
    dose: aplicacao.dose,
  }));
}

export async function getWhatsappAutoEnviosByMedicoAndDate(
  medicoId: string,
  data: string,
): Promise<WhatsappAutoAplicacaoEnvio[]> {
  const id = medicoId?.trim();
  const dateKey = data?.trim();
  if (!id || !dateKey) return [];

  const snap = await getFirestoreAdmin()
    .collection(ENVIOS_COLLECTION)
    .where('medicoId', '==', id)
    .where('data', '==', dateKey)
    .get();

  return snap.docs.map((doc) => docToEnvio(doc.id, doc.data() as Record<string, unknown>));
}

export async function getWhatsappAutoEnvioStatusMap(
  medicoId: string,
  data: string,
): Promise<Record<string, WhatsappAutoAplicacaoEnvioStatus>> {
  const envios = await getWhatsappAutoEnviosByMedicoAndDate(medicoId, data);
  const map: Record<string, WhatsappAutoAplicacaoEnvioStatus> = {};
  for (const envio of envios) {
    map[buildWhatsappAutoAplicacaoEnvioKey(envio.pacienteId, envio.data, envio.semana)] = envio.status;
  }
  return map;
}

export async function listarAplicacoesPendentesAutoEnvio(
  medicoId: string,
  dateKey: string,
): Promise<AplicacaoPendenteAutoEnvio[]> {
  const db = getFirestoreAdmin();

  const pacientesSnap = await db
    .collection('pacientes_completos')
    .where('medicoResponsavelId', '==', medicoId)
    .get();

  const enviosMap = await getWhatsappAutoEnvioStatusMap(medicoId, dateKey);
  const pendentes: AplicacaoPendenteAutoEnvio[] = [];

  for (const doc of pacientesSnap.docs) {
    const raw = doc.data() as Record<string, unknown>;
    if (!pacienteElegivelCalendario(raw.statusTratamento)) continue;

    const paciente = pacienteFromFirestore(doc.id, raw);
    const telefone = extrairTelefonePaciente(raw);
    if (!telefone) continue;

    const aplicacoes = listarAplicacoesDoDiaPaciente(paciente, dateKey);
    for (const aplicacao of aplicacoes) {
      const key = buildWhatsappAutoAplicacaoEnvioKey(paciente.id, dateKey, aplicacao.semana);
      if (enviosMap[key] === 'sent') continue;

      pendentes.push({
        pacienteId: paciente.id,
        pacienteNome: paciente.nome ?? paciente.dadosIdentificacao?.nomeCompleto ?? 'Paciente',
        telefone,
        data: dateKey,
        semana: aplicacao.semana,
        dose: aplicacao.dose,
        ehHoje: true,
      });
    }
  }

  pendentes.sort((a, b) => a.pacienteNome.localeCompare(b.pacienteNome, 'pt-BR'));
  return pendentes;
}

export async function diagnosticarAutoAplicacaoMedico(medicoId: string): Promise<AutoAplicacaoDiagnostico> {
  let connection = await getWhatsappConnectionByDoctor(medicoId);
  const brasil = getBrasilDateTimeParts();
  const horarioConfigurado = connection?.autoAplicacaoHorario ?? '08:00';
  const bloqueios: string[] = [];

  const authorized = await isDoctorAutoAplicacaoDiaAuthorized(
    medicoId,
    connection?.organizationId,
  );

  // Evita falso "desativado" quando o flap já autoriza mas a flag legado ficou para trás.
  if (authorized && connection?.status === 'connected' && connection.autoAplicacaoEnabled !== true) {
    await syncLegacyAutoAplicacaoFromDoctorSettings(medicoId);
    connection = await getWhatsappConnectionByDoctor(medicoId);
  }

  if (!connection) bloqueios.push('Nenhuma conexão WhatsApp cadastrada.');
  if (connection && connection.status !== 'connected') bloqueios.push('WhatsApp não está conectado.');
  if (!authorized) bloqueios.push('Lembrete automático desativado.');
  if (!horarioConfiguradoJaPassou(brasil.hhmm, connection?.autoAplicacaoHorario ?? horarioConfigurado)) {
    bloqueios.push(
      `Horário configurado (${connection?.autoAplicacaoHorario ?? horarioConfigurado}) ainda não chegou em Brasília.`,
    );
  }
  if (connection && !podeEnviarAgora(connection.autoAplicacaoUltimoEnvioEm)) {
    bloqueios.push('Aguardando intervalo de 1 minuto desde o último envio.');
  }

  const db = getFirestoreAdmin();
  const pacientesSnap = await db
    .collection('pacientes_completos')
    .where('medicoResponsavelId', '==', medicoId)
    .get();

  let aplicacoesHoje = 0;
  const semTelefone: AutoAplicacaoDiagnostico['semTelefone'] = [];

  for (const doc of pacientesSnap.docs) {
    const raw = doc.data() as Record<string, unknown>;
    if (!pacienteElegivelCalendario(raw.statusTratamento)) continue;

    const paciente = pacienteFromFirestore(doc.id, raw);
    const aplicacoes = listarAplicacoesDoDiaPaciente(paciente, brasil.dateKey);
    if (aplicacoes.length === 0) continue;

    aplicacoesHoje += aplicacoes.length;
    if (!extrairTelefonePaciente(raw)) {
      for (const aplicacao of aplicacoes) {
        semTelefone.push({
          pacienteId: paciente.id,
          pacienteNome: paciente.nome ?? paciente.dadosIdentificacao?.nomeCompleto ?? 'Paciente',
          semana: aplicacao.semana,
        });
      }
    }
  }

  const pendentes = await listarAplicacoesPendentesAutoEnvio(medicoId, brasil.dateKey);
  if (aplicacoesHoje === 0) {
    bloqueios.push('Nenhuma aplicação prevista para hoje no calendário dos seus pacientes.');
  } else if (pendentes.length === 0 && semTelefone.length === 0) {
    bloqueios.push('Todas as aplicações de hoje já foram enviadas ou registradas.');
  } else if (pendentes.length === 0 && semTelefone.length > 0) {
    bloqueios.push('Há aplicações hoje, mas os pacientes estão sem telefone válido no cadastro.');
  }

  return {
    brasil,
    autoAplicacaoEnabled: authorized || connection?.autoAplicacaoEnabled === true,
    whatsappConnected: connection?.status === 'connected',
    horarioConfigurado: connection?.autoAplicacaoHorario ?? horarioConfigurado,
    envioLiberado: horarioConfiguradoJaPassou(
      brasil.hhmm,
      connection?.autoAplicacaoHorario ?? horarioConfigurado,
    ),
    aplicacoesHoje,
    pendentesEnvio: pendentes.length,
    semTelefone: semTelefone.slice(0, 10),
    proximosPendentes: pendentes.slice(0, 5).map((p) => ({
      pacienteNome: p.pacienteNome,
      semana: p.semana,
      dose: p.dose,
      telefone: p.telefone,
    })),
    bloqueios,
  };
}

function motivosBloqueioGlobalAutoEnvio(params: {
  connection: Awaited<ReturnType<typeof getWhatsappConnectionByDoctor>>;
  brasilHhmm: string;
  horarioConfigurado: string;
  isHoje: boolean;
  autoAplicacaoEnabled: boolean;
}): string[] {
  const { connection, brasilHhmm, horarioConfigurado, isHoje, autoAplicacaoEnabled } = params;
  const motivos: string[] = [];

  if (!connection) motivos.push('Nenhuma conexão WhatsApp cadastrada.');
  else if (connection.status !== 'connected') motivos.push('WhatsApp não está conectado.');
  if (!autoAplicacaoEnabled) motivos.push('Lembrete automático desativado.');
  if (isHoje && !horarioConfiguradoJaPassou(brasilHhmm, horarioConfigurado)) {
    motivos.push(`Aguardando horário configurado (${horarioConfigurado} · Brasília).`);
  }

  return motivos;
}

function statusPendenteAutoEnvio(params: {
  isHoje: boolean;
  globalMotivos: string[];
  connection: Awaited<ReturnType<typeof getWhatsappConnectionByDoctor>>;
}): { status: AutoAplicacaoPainelItemStatus; motivo: string } {
  const { isHoje, globalMotivos, connection } = params;

  if (globalMotivos.length > 0) {
    return { status: 'skipped', motivo: globalMotivos.join(' ') };
  }

  if (!isHoje) {
    return { status: 'skipped', motivo: 'Não houve registro de envio para esta aplicação.' };
  }

  if (connection && !podeEnviarAgora(connection.autoAplicacaoUltimoEnvioEm)) {
    return {
      status: 'pending',
      motivo: 'Na fila — aguardando intervalo de 1 minuto entre envios.',
    };
  }

  return { status: 'pending', motivo: 'Na fila — aguardando envio pelo cron.' };
}

function detalheCronParaFila(heartbeat: WhatsappCronHeartbeat | null, isHoje: boolean): string | null {
  if (!isHoje) return null;
  if (!heartbeat) return null;
  if (heartbeat.skipped) {
    // Migração / skip operacional — não expor texto técnico ao médico na agenda.
    if (
      heartbeat.skipReason === 'migrated_to_queue' ||
      `${heartbeat.skipMessage ?? ''}`.toLowerCase().includes('migrou')
    ) {
      return null;
    }
    return null;
  }
  const minutos = Math.max(0, Math.round((Date.now() - heartbeat.ranAt.getTime()) / 60_000));
  if (minutos > 3) return null;
  if (heartbeat.enviados > 0) {
    return `Último envio automático há ${minutos || '<1'} min.`;
  }
  return null;
}

/** Status por aplicação do dia — para o Log (confrontar data, horário e envio). */
export async function listarAplicacoesAutoEnvioPainel(
  medicoId: string,
  dateKey?: string,
): Promise<{
  dateKey: string;
  brasilDateKey: string;
  brasilHhmm: string;
  horarioConfigurado: string;
  autoAplicacaoEnabled: boolean;
  whatsappConnected: boolean;
  aplicacoes: AutoAplicacaoPainelItem[];
}> {
  let connection = await getWhatsappConnectionByDoctor(medicoId);
  const brasil = getBrasilDateTimeParts();
  const targetDate = dateKey?.trim() || brasil.dateKey;
  let horarioConfigurado = connection?.autoAplicacaoHorario ?? '08:00';
  const isHoje = targetDate === brasil.dateKey;

  const authorized = await isDoctorAutoAplicacaoDiaAuthorized(
    medicoId,
    connection?.organizationId,
  );
  if (authorized && connection?.status === 'connected' && connection.autoAplicacaoEnabled !== true) {
    await syncLegacyAutoAplicacaoFromDoctorSettings(medicoId);
    connection = await getWhatsappConnectionByDoctor(medicoId);
    horarioConfigurado = connection?.autoAplicacaoHorario ?? horarioConfigurado;
  }

  const autoAplicacaoEnabled = authorized || connection?.autoAplicacaoEnabled === true;
  const globalMotivos = motivosBloqueioGlobalAutoEnvio({
    connection,
    brasilHhmm: brasil.hhmm,
    horarioConfigurado,
    isHoje,
    autoAplicacaoEnabled,
  });
  const cronHeartbeat = isHoje ? await getWhatsappCronHeartbeat() : null;
  const cronDetalhe = detalheCronParaFila(cronHeartbeat, isHoje);

  const envios = await getWhatsappAutoEnviosByMedicoAndDate(medicoId, targetDate);
  const envioByKey = new Map<string, WhatsappAutoAplicacaoEnvio>();
  for (const envio of envios) {
    envioByKey.set(
      buildWhatsappAutoAplicacaoEnvioKey(envio.pacienteId, envio.data, envio.semana),
      envio,
    );
  }

  const db = getFirestoreAdmin();
  const pacientesSnap = await db
    .collection('pacientes_completos')
    .where('medicoResponsavelId', '==', medicoId)
    .get();

  const aplicacoes: AutoAplicacaoPainelItem[] = [];

  for (const doc of pacientesSnap.docs) {
    const raw = doc.data() as Record<string, unknown>;
    if (!pacienteElegivelCalendario(raw.statusTratamento)) continue;

    const paciente = pacienteFromFirestore(doc.id, raw);
    const telefone = extrairTelefonePaciente(raw) ?? undefined;
    const nome = paciente.nome ?? paciente.dadosIdentificacao?.nomeCompleto ?? 'Paciente';
    const doDia = listarAplicacoesDoDiaPaciente(paciente, targetDate);

    for (const aplicacao of doDia) {
      const key = buildWhatsappAutoAplicacaoEnvioKey(paciente.id, targetDate, aplicacao.semana);
      const envio = envioByKey.get(key);
      const base = {
        pacienteId: paciente.id,
        pacienteNome: nome,
        telefone,
        aplicacaoData: targetDate,
        semana: aplicacao.semana,
        dose: aplicacao.dose,
        horarioConfigurado,
      };

      if (envio?.status === 'sent') {
        aplicacoes.push({
          ...base,
          status: 'sent',
          enviadoEm: envio.sentAt,
        });
        continue;
      }

      if (envio?.status === 'failed') {
        aplicacoes.push({
          ...base,
          status: 'failed',
          enviadoEm: envio.sentAt,
          motivo: envio.errorMessage ?? 'Falha no envio da mensagem.',
        });
        continue;
      }

      if (!telefone) {
        aplicacoes.push({
          ...base,
          status: 'skipped',
          motivo: 'Sem telefone válido no cadastro (dadosIdentificacao.telefone).',
        });
        continue;
      }

      const pendente = statusPendenteAutoEnvio({ isHoje, globalMotivos, connection });
      const motivo =
        pendente.status === 'pending' && cronDetalhe
          ? `${pendente.motivo} ${cronDetalhe}`
          : pendente.motivo;
      aplicacoes.push({ ...base, status: pendente.status, motivo });
    }
  }

  aplicacoes.sort((a, b) => a.pacienteNome.localeCompare(b.pacienteNome, 'pt-BR'));

  return {
    dateKey: targetDate,
    brasilDateKey: brasil.dateKey,
    brasilHhmm: brasil.hhmm,
    horarioConfigurado,
    autoAplicacaoEnabled,
    whatsappConnected: connection?.status === 'connected',
    aplicacoes,
  };
}

function parseDateKeyLocal(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

async function registrarEnvio(params: {
  medicoId: string;
  pacienteId: string;
  pacienteNome?: string;
  telefone?: string;
  message?: string;
  data: string;
  semana: number;
  dose: number;
  status: WhatsappAutoAplicacaoEnvioStatus;
  errorMessage?: string;
}): Promise<void> {
  const docId = buildWhatsappAutoAplicacaoEnvioId(
    params.medicoId,
    params.pacienteId,
    params.data,
    params.semana,
  );

  await getFirestoreAdmin()
    .collection(ENVIOS_COLLECTION)
    .doc(docId)
    .set(
      {
        medicoId: params.medicoId,
        pacienteId: params.pacienteId,
        data: params.data,
        semana: params.semana,
        dose: params.dose,
        status: params.status,
        sentAt: Timestamp.now(),
        errorMessage: params.errorMessage ?? null,
      },
      { merge: true },
    );

  await registrarWhatsappMessageLog({
    medicoId: params.medicoId,
    type: 'auto_aplicacao',
    status: params.status,
    phone: params.telefone,
    message: params.message,
    pacienteId: params.pacienteId,
    pacienteNome: params.pacienteNome,
    aplicacaoData: params.data,
    semana: params.semana,
    dose: params.dose,
    errorMessage: params.errorMessage,
    docId: `auto_${docId}`,
  });
}

function podeEnviarAgora(ultimoEnvio?: Date): boolean {
  if (!ultimoEnvio) return true;
  return Date.now() - ultimoEnvio.getTime() >= AUTO_SEND_GAP_MS;
}

export async function processarProximoAutoEnvioMedico(medicoId: string): Promise<{
  processed: boolean;
  sent?: boolean;
  pacienteId?: string;
  error?: string;
}> {
  let connection = await getWhatsappConnectionByDoctor(medicoId);
  if (!connection || connection.status !== 'connected') {
    return { processed: false };
  }

  const authorized = await isDoctorAutoAplicacaoDiaAuthorized(
    medicoId,
    connection.organizationId,
  );
  if (!authorized) {
    return { processed: false };
  }

  // Cron não pode depender só da flag legado — se o flap autoriza, espelha e envia.
  if (connection.autoAplicacaoEnabled !== true) {
    await syncLegacyAutoAplicacaoFromDoctorSettings(medicoId);
    connection = (await getWhatsappConnectionByDoctor(medicoId)) ?? connection;
    connection.autoAplicacaoEnabled = true;
  }

  const horario = connection.autoAplicacaoHorario ?? '08:00';
  const brasil = getBrasilDateTimeParts();
  if (!horarioConfiguradoJaPassou(brasil.hhmm, horario)) {
    return { processed: false };
  }

  if (!podeEnviarAgora(connection.autoAplicacaoUltimoEnvioEm)) {
    return { processed: false };
  }

  const pendentes = await listarAplicacoesPendentesAutoEnvio(medicoId, brasil.dateKey);
  const proximo = pendentes[0];
  if (!proximo) {
    return { processed: false };
  }

  const db = getFirestoreAdmin();

  try {
    const url = await ensureAplicacaoPublicUrl(db, {
      pacienteId: proximo.pacienteId,
      data: parseDateKeyLocal(proximo.data),
      semana: proximo.semana,
      dose: proximo.dose,
    });

    const message = buildAplicacaoWhatsAppMessage({
      primeiroNome: primeiroNomePaciente(proximo.pacienteNome),
      url,
      ehHoje: proximo.ehHoje,
    });

    await sendPatientAutomationWhatsapp({
      ownerId: medicoId,
      ownerSessionId: connection.sessionId,
      ownerConnectedPhone: connection.phone,
      phone: proximo.telefone,
      message,
    });

    await registrarEnvio({
      medicoId,
      pacienteId: proximo.pacienteId,
      pacienteNome: proximo.pacienteNome,
      telefone: proximo.telefone,
      message,
      data: proximo.data,
      semana: proximo.semana,
      dose: proximo.dose,
      status: 'sent',
    });
    await touchWhatsappAutoAplicacaoUltimoEnvio(medicoId);

    return { processed: true, sent: true, pacienteId: proximo.pacienteId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar mensagem automática.';

    await registrarEnvio({
      medicoId,
      pacienteId: proximo.pacienteId,
      pacienteNome: proximo.pacienteNome,
      telefone: proximo.telefone,
      data: proximo.data,
      semana: proximo.semana,
      dose: proximo.dose,
      status: 'failed',
      errorMessage,
    });
    await touchWhatsappAutoAplicacaoUltimoEnvio(medicoId);

    return { processed: true, sent: false, pacienteId: proximo.pacienteId, error: errorMessage };
  }
}

export async function processarAutoEnviosAplicacaoCron(): Promise<{
  medicos: number;
  enviados: number;
  falhas: number;
}> {
  const { listWhatsappConnectionsAutoAplicacaoAtivas } = await import('@/services/whatsappConnectionService');
  const connections = await listWhatsappConnectionsAutoAplicacaoAtivas();

  let enviados = 0;
  let falhas = 0;

  for (const connection of connections) {
    const result = await processarProximoAutoEnvioMedico(connection.doctorId);
    if (result.sent) enviados += 1;
    if (result.processed && result.sent === false) falhas += 1;
  }

  return { medicos: connections.length, enviados, falhas };
}
