import type { Firestore } from 'firebase-admin/firestore';
import { buildCheckInMenuContextFromPlano, toPublicCheckInMenuContext } from '@/lib/nutri/checkInSemanalNutriMenuContext';
import type { CheckInMenuContext } from '@/lib/nutri/checkInSemanalNutriV3';

export async function loadCheckInMenuContextAdmin(
  db: Firestore,
  patientId: string
): Promise<CheckInMenuContext> {
  const snap = await db.collection('pacientes_completos').doc(patientId).collection('nutricao').doc('plano').get();
  return toPublicCheckInMenuContext(buildCheckInMenuContextFromPlano((snap.data() || {}) as Record<string, unknown>));
}
