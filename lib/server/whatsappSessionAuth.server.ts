import {
  getWhatsappConnectionByDoctor,
  saveWhatsappSessionToken,
} from '@/services/whatsappConnectionService';
import {
  generateWppSessionToken,
  WhatsappProviderError,
} from '@/services/whatsappProviderClient';

export type WhatsappProviderAuthResult<T> = {
  result: T;
  accessToken: string;
};

function isAuthError(error: unknown): boolean {
  return error instanceof WhatsappProviderError && error.code === 'AUTH_ERROR';
}

/**
 * Garante token Bearer WPPConnect por sessionId, com retry automático em 401/403.
 * Persiste o token em whatsappConnections/{doctorId} — nunca exposto ao front.
 */
export async function withWhatsappProviderAuth<T>(
  doctorId: string,
  sessionId: string,
  fn: (accessToken: string) => Promise<T>,
): Promise<WhatsappProviderAuthResult<T>> {
  const id = doctorId?.trim();
  const sid = sessionId?.trim();
  if (!id) throw new Error('doctorId é obrigatório.');
  if (!sid) throw new Error('sessionId é obrigatório.');

  const connection = await getWhatsappConnectionByDoctor(id);
  let accessToken = connection?.wppSessionToken?.trim() || '';

  if (!accessToken) {
    accessToken = await generateWppSessionToken(sid);
    await saveWhatsappSessionToken(id, accessToken);
  }

  try {
    const result = await fn(accessToken);
    return { result, accessToken };
  } catch (error) {
    if (!isAuthError(error)) throw error;

    accessToken = await generateWppSessionToken(sid);
    await saveWhatsappSessionToken(id, accessToken);
    const result = await fn(accessToken);
    return { result, accessToken };
  }
}
