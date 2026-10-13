import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  criarSnapshotAnamneseNutricional,
  planoTemAnamneseNutricional,
  planoTemCalculosNutricionais,
  type AnamneseWizardInput,
} from '@/lib/nutri/anamneseNutricional';
import { montarCamposPlanoFromAnamnese } from '@/lib/nutri/gerarPlanoFromAnamnese';

const PLANO_PATH = (pacienteId: string) =>
  getFirestoreAdmin().collection('pacientes_completos').doc(pacienteId).collection('nutricao').doc('plano');

export async function pacienteTemAnamneseNutricional(pacienteId: string): Promise<boolean> {
  const snap = await PLANO_PATH(pacienteId).get();
  if (!snap.exists) return false;
  return planoTemAnamneseNutricional(snap.data() || {});
}

function omitUndefinedDeep<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => omitUndefinedDeep(item)) as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (nested === undefined) continue;
      out[key] = omitUndefinedDeep(nested);
    }
    return out as T;
  }
  return value;
}

async function loadPacienteParaPlano(pacienteId: string): Promise<PacienteCompleto> {
  const snap = await getFirestoreAdmin().collection('pacientes_completos').doc(pacienteId).get();
  return { id: pacienteId, ...(snap.data() || {}) } as PacienteCompleto;
}

/**
 * Persiste a anamnese pública e já fecha o Plano Nutri (estilo + proteína + metas).
 * Não sobrescreve um plano que o nutricionista já calculou.
 */
export async function savePublicNutriAnamnese(
  pacienteId: string,
  wizard: AnamneseWizardInput
): Promise<void> {
  const ref = PLANO_PATH(pacienteId);
  const existing = await ref.get();
  const existingData = existing.data() || {};

  if (existing.exists && planoTemCalculosNutricionais(existingData)) {
    await ref.set(
      {
        anamneseNutricional: criarSnapshotAnamneseNutricional(wizard),
        atualizadoEm: FieldValue.serverTimestamp(),
        anamnesePendenteGeracao: FieldValue.delete(),
      },
      { merge: true }
    );
    return;
  }

  const campos = montarCamposPlanoFromAnamnese(await loadPacienteParaPlano(pacienteId), wizard);
  const camposLimpos = omitUndefinedDeep(campos);

  if (!existing.exists) {
    await ref.set({
      ...camposLimpos,
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    return;
  }

  await ref.set(
    {
      ...camposLimpos,
      atualizadoEm: FieldValue.serverTimestamp(),
      anamnesePendenteGeracao: FieldValue.delete(),
    },
    { merge: true }
  );
}
