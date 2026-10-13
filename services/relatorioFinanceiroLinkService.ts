import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';
import { buildOrganizacaoPublicUrl } from '@/lib/organization/organizationUrls';
import { allocateUniquePublicLinkToken } from '@/lib/publicLinks/publicLinkToken';

/**
 * Obtém ou cria o link público do relatório financeiro do paciente.
 */
export async function getOrCreateRelatorioFinanceiroUrl(pacienteId: string): Promise<string> {
  const id = pacienteId?.trim();
  if (!id) throw new Error('pacienteId é obrigatório.');

  const db = getFirestoreAdmin();
  const snapshot = await db
    .collection('relatorio_financeiro_links')
    .where('pacienteId', '==', id)
    .limit(1)
    .get();

  let token: string;
  if (!snapshot.empty) {
    token = snapshot.docs[0].id;
  } else {
    token = await allocateUniquePublicLinkToken(db, 'relatorio_financeiro_links', {
      pacienteId: id,
      createdAt: new Date(),
      ...shadowOrganizationFields(),
    });
  }

  return buildOrganizacaoPublicUrl(`/relatoriofinanceiro/${token}`);
}
