import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { buildCheckInMenuContextFromPlano } from '@/lib/nutri/checkInSemanalNutriMenuContext';
import type { CheckInMenuContext } from '@/lib/nutri/checkInSemanalNutriV3';

export async function loadCheckInMenuContext(patientId: string): Promise<CheckInMenuContext> {
  if (!patientId) return { meals: [] };
  const snap = await getDoc(doc(db, 'pacientes_completos', patientId, 'nutricao', 'plano'));
  if (!snap.exists()) return { meals: [] };
  return buildCheckInMenuContextFromPlano(snap.data() as Record<string, unknown>);
}
