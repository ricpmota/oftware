/**
 * Espelho denormalizado em pacientes_completos:
 *   nutricionistaVinculadoIds  ← paciente_nutricionista
 *   personalTrainerVinculadoIds ← paciente_personal_trainer
 *   psiquiatraVinculadoIds ← paciente_psiquiatra
 *
 * Fonte de verdade continua sendo as coleções de vínculo/ACL.
 */

import { doc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COL_PACIENTE_NUTRICIONISTA } from '@/features/metaNutri/metaNutri.constants';
import { COL_PACIENTE_PERSONAL_TRAINER } from '@/features/metaPersonal/metaPersonal.constants';
import { COL_PACIENTE_PSIQUIATRA } from '@/features/metaPsi/metaPsi.constants';

function uniqueIds(ids: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = String(raw || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export async function syncPacienteProfissionaisEspelho(pacienteId: string): Promise<{
  nutricionistaVinculadoIds: string[];
  personalTrainerVinculadoIds: string[];
  psiquiatraVinculadoIds: string[];
}> {
  const pid = String(pacienteId || '').trim();
  if (!pid) {
    return {
      nutricionistaVinculadoIds: [],
      personalTrainerVinculadoIds: [],
      psiquiatraVinculadoIds: [],
    };
  }

  const [nutriSnap, personalSnap, psiSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, COL_PACIENTE_NUTRICIONISTA),
        where('pacienteId', '==', pid),
        where('status', '==', 'ativo')
      )
    ).catch(() => null),
    getDocs(
      query(
        collection(db, COL_PACIENTE_PERSONAL_TRAINER),
        where('pacienteId', '==', pid),
        where('status', '==', 'ativo')
      )
    ).catch(() => null),
    getDocs(
      query(
        collection(db, COL_PACIENTE_PSIQUIATRA),
        where('pacienteId', '==', pid),
        where('status', '==', 'ativo')
      )
    ).catch(() => null),
  ]);

  const nutricionistaVinculadoIds = uniqueIds(
    (nutriSnap?.docs || []).map((d) => d.data()?.nutricionistaId as string)
  );
  const personalTrainerVinculadoIds = uniqueIds(
    (personalSnap?.docs || []).map((d) => d.data()?.personalTrainerId as string)
  );
  const psiquiatraVinculadoIds = uniqueIds(
    (psiSnap?.docs || []).map((d) => d.data()?.psiquiatraId as string)
  );

  try {
    await updateDoc(doc(db, 'pacientes_completos', pid), {
      nutricionistaVinculadoIds,
      personalTrainerVinculadoIds,
      psiquiatraVinculadoIds,
    });
  } catch (e) {
    console.warn('[syncPacienteProfissionaisEspelho] update pacientes_completos', pid, e);
  }

  return {
    nutricionistaVinculadoIds,
    personalTrainerVinculadoIds,
    psiquiatraVinculadoIds,
  };
}
