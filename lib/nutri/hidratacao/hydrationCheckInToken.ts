import { createHash, randomBytes } from 'crypto';
import {
  HYDRATION_CHECKIN_TOKEN_BYTES,
  isHydrationCheckInSecretToken,
  normalizeHydrationCheckInToken,
} from '@/lib/nutri/hidratacao/hydrationCheckInLink';

export function hashHydrationCheckInToken(token: string): string {
  const normalized = normalizeHydrationCheckInToken(token);
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

export function generateHydrationCheckInToken(): string {
  const token = randomBytes(HYDRATION_CHECKIN_TOKEN_BYTES).toString('base64url');
  if (!isHydrationCheckInSecretToken(token)) {
    throw new Error('Falha ao gerar token de hidratação.');
  }
  return token;
}
