/**
 * Helper de autorização Paciente ↔ Psiquiatra.
 * Fonte de verdade: paciente_psiquiatra/{pacienteId}_{psiquiatraId} com status ativo.
 * O mirror pacientes_completos.psiquiatraVinculadoIds NÃO autoriza sozinho.
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COL_PACIENTE_PSIQUIATRA } from '@/features/metaPsi/metaPsi.constants';

export function pacientePsiquiatraDocId(pacienteId: string, psiquiatraId: string): string {
  return `${String(pacienteId || '').trim()}_${String(psiquiatraId || '').trim()}`;
}

export async function hasActivePsiquiatraAccess(
  pacienteId: string,
  psiquiatraId: string
): Promise<boolean> {
  const pid = String(pacienteId || '').trim();
  const psiId = String(psiquiatraId || '').trim();
  if (!pid || !psiId) return false;

  const snap = await getDoc(doc(db, COL_PACIENTE_PSIQUIATRA, pacientePsiquiatraDocId(pid, psiId)));
  if (!snap.exists()) return false;
  return String(snap.data()?.status || '') === 'ativo';
}
