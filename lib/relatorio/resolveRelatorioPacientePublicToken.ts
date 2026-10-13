import {
  isShortPublicLinkToken,
  normalizePublicLinkToken,
} from '@/lib/publicLinks/publicLinkToken';

/**
 * Prefere o código curto (8 caracteres, sem 0/O/1/I). Hex legado continua válido na URL,
 * mas o link gerado/exibido passa a ser o curto.
 */
export function resolveRelatorioPacientePublicToken(docIds: string[]): {
  shortToken: string | null;
} {
  for (const id of docIds) {
    const token = normalizePublicLinkToken(id);
    if (isShortPublicLinkToken(token)) return { shortToken: token };
  }
  return { shortToken: null };
}
