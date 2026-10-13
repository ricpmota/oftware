/**
 * ACL Paciente ↔ Psiquiatra (Admin SDK).
 * SoT: paciente_psiquiatra/{pacienteId}_{psiquiatraId} com status === 'ativo'.
 * Mirror psiquiatraVinculadoIds / medicoVinculadoIds NÃO autorizam.
 */

import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  COL_PACIENTE_PSIQUIATRA,
  PSIQUIATRA_STATUS,
} from '@/features/metaPsi/metaPsi.constants';
import { pacientePsiquiatraDocId } from '@/lib/metapsi/hasActivePsiquiatraAccess';

export async function hasActivePsiquiatraAccessAdmin(
  pacienteId: string,
  psiquiatraId: string
): Promise<boolean> {
  const pid = String(pacienteId || '').trim();
  const psiId = String(psiquiatraId || '').trim();
  if (!pid || !psiId) return false;

  const snap = await getFirestoreAdmin()
    .collection(COL_PACIENTE_PSIQUIATRA)
    .doc(pacientePsiquiatraDocId(pid, psiId))
    .get();

  if (!snap.exists) return false;
  return String(snap.data()?.status || '') === PSIQUIATRA_STATUS.ATIVO;
}
