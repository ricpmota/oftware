import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  mapOrcamentoTerapeuticoConfigFromFirestore,
  ORCAMENTO_TERAPEUTICO_CONFIG_DOC_ID,
} from '@/lib/metaadmin/orcamentoTerapeuticoConfigMap';
import type { OrcamentoTerapeuticoConfig } from '@/types/orcamentoTerapeuticoConfig';

export async function getOrcamentoTerapeuticoConfigByMedico(
  medicoId: string
): Promise<OrcamentoTerapeuticoConfig | null> {
  const id = medicoId?.trim();
  if (!id) return null;

  const snap = await getFirestoreAdmin()
    .collection('medicos')
    .doc(id)
    .collection('configuracoes')
    .doc(ORCAMENTO_TERAPEUTICO_CONFIG_DOC_ID)
    .get();

  if (!snap.exists) return null;

  return mapOrcamentoTerapeuticoConfigFromFirestore(id, snap.data() as Record<string, unknown>);
}
