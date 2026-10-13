import type { Firestore } from 'firebase-admin/firestore';
import {
  allocateUniquePublicLinkToken,
  generatePublicLinkToken,
  isValidPublicLinkToken,
  normalizePublicLinkToken,
  PUBLIC_LINK_TOKEN_ALPHABET,
  PUBLIC_LINK_TOKEN_LENGTH,
} from '@/lib/publicLinks/publicLinkToken';

export const APLICACAO_PUBLIC_TOKEN_ALPHABET = PUBLIC_LINK_TOKEN_ALPHABET;
export const APLICACAO_PUBLIC_TOKEN_LENGTH = PUBLIC_LINK_TOKEN_LENGTH;
export const generateAplicacaoPublicToken = generatePublicLinkToken;
export const normalizeAplicacaoPublicToken = normalizePublicLinkToken;
export const isValidAplicacaoPublicToken = isValidPublicLinkToken;

export async function allocateUniqueAplicacaoPublicToken(
  db: Firestore,
  payload: Record<string, unknown>,
  maxAttempts = 8
): Promise<string> {
  return allocateUniquePublicLinkToken(db, 'aplicacao_links', payload, maxAttempts);
}
