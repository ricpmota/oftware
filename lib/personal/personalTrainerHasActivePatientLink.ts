import type { Firestore } from 'firebase-admin/firestore';
import { COL_PACIENTE_PERSONAL_TRAINER } from '@/features/metaPersonal/metaPersonal.constants';

export async function personalTrainerHasActivePatientLink(
  db: Firestore,
  personalTrainerId: string,
  patientId: string
): Promise<boolean> {
  const trainerId = personalTrainerId.trim();
  const pid = patientId.trim();
  if (!trainerId || !pid) return false;
  const snap = await db
    .collection(COL_PACIENTE_PERSONAL_TRAINER)
    .where('personalTrainerId', '==', trainerId)
    .where('pacienteId', '==', pid)
    .where('status', '==', 'ativo')
    .limit(1)
    .get();
  return !snap.empty;
}
