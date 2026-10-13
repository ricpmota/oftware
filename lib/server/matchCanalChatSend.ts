import type { Firestore } from 'firebase-admin/firestore';
import { CANAL_CHAT_OWNER_ID, CANAL_CHAT_SESSION_ID } from '@/lib/whatsapp/canalChatOwner';
import { resolveInternationalPhone, tryResolvePhoneFromPacienteDoc } from '@/lib/whatsapp/resolveInternationalPhone';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { sendPatientAutomationWhatsapp } from '@/services/whatsappPatientSendRouter';
import type { MatchPhoneSource } from '@/lib/match/matchAdminTypes';

export type MatchPhoneHit = { phone: string; source: MatchPhoneSource };

export type CanalChatSender = { sessionId: string; phone?: string };

export function maskMatchPhoneTail(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

export async function resolveMatchPhone(db: Firestore, uid: string): Promise<MatchPhoneHit | null> {
  const patientSnap = await db.collection('pacientes_completos').where('userId', '==', uid).limit(1).get();
  const patient = patientSnap.docs[0]?.data() as Record<string, unknown> | undefined;
  if (patient) {
    const phone = tryResolvePhoneFromPacienteDoc(patient);
    if (phone) return { phone, source: 'paciente' };
  }
  const doctorSnap = await db.collection('medicos').where('userId', '==', uid).limit(1).get();
  const doctor = doctorSnap.docs[0]?.data() as Record<string, unknown> | undefined;
  if (!doctor) return null;
  try {
    const phone = resolveInternationalPhone({
      telefone: typeof doctor.telefone === 'string' ? doctor.telefone : null,
      telefoneDdi: typeof doctor.telefoneDdi === 'string' ? doctor.telefoneDdi : null,
      telefoneE164: typeof doctor.telefoneE164 === 'string' ? doctor.telefoneE164 : null,
    });
    return phone ? { phone, source: 'medico' } : null;
  } catch {
    return null;
  }
}

export async function loadCanalChatSender(): Promise<CanalChatSender | null> {
  const canalChat = await getWhatsappConnectionByDoctor(CANAL_CHAT_OWNER_ID);
  const sessionId = canalChat?.sessionId?.trim() || CANAL_CHAT_SESSION_ID;
  if (!canalChat || canalChat.status !== 'connected' || !sessionId) return null;
  return { sessionId, phone: canalChat.phone ?? undefined };
}

export async function sendMatchCanalChatMessage(
  phone: string,
  message: string,
  sender: CanalChatSender | null,
): Promise<{ status: 'sent' | 'channel_offline' | 'failed'; error?: string }> {
  if (!sender) return { status: 'channel_offline' };
  try {
    await sendPatientAutomationWhatsapp({
      ownerId: CANAL_CHAT_OWNER_ID,
      ownerSessionId: sender.sessionId,
      ownerConnectedPhone: sender.phone,
      phone,
      message,
    });
    return { status: 'sent' };
  } catch (error) {
    return { status: 'failed', error: error instanceof Error ? error.message : 'falha no envio' };
  }
}
