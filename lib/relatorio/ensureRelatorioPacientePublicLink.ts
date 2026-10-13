import type { Firestore } from 'firebase-admin/firestore';
import { allocateUniquePublicLinkToken } from '@/lib/publicLinks/publicLinkToken';
import { buildOrganizacaoPublicUrl } from '@/lib/tenant/organizacaoPublicOrigin';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';
import { resolveRelatorioPacientePublicToken } from '@/lib/relatorio/resolveRelatorioPacientePublicToken';

/**
 * Garante documento em relatorio_paciente_links e retorna token + URL /relatorio/{token}.
 * Se existir só hex legado, cria um código curto (ex.: X23KMD7P) e passa a devolver esse.
 * URLs hex antigas continuam resolvendo.
 */
export async function ensureRelatorioPacientePublicLink(
  db: Firestore,
  pacienteId: string,
  baseUrl?: string
): Promise<{ token: string; url: string }> {
  const pid = pacienteId.trim();
  const snapshot = await db
    .collection('relatorio_paciente_links')
    .where('pacienteId', '==', pid)
    .get();

  const { shortToken } = resolveRelatorioPacientePublicToken(snapshot.docs.map((d) => d.id));
  let token = shortToken;
  if (!token) {
    token = await allocateUniquePublicLinkToken(db, 'relatorio_paciente_links', {
      pacienteId: pid,
      createdAt: new Date(),
      ...shadowOrganizationFields(),
    });
  }

  return {
    token,
    url: buildOrganizacaoPublicUrl(`/relatorio/${token}`, baseUrl),
  };
}
