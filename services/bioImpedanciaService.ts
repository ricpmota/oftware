import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import { parseBioDataRegistro } from '@/utils/bioImpedanciaDate';

const COLLECTION = 'pacientes_completos';

/** Salvar ou atualizar registros de bio impedância do paciente */
export async function salvarBioImpedanciaRegistros(
  pacienteId: string,
  registros: BioImpedanciaRegistro[]
): Promise<void> {
  const ref = doc(db, COLLECTION, pacienteId);
  await updateDoc(ref, {
    bioimpedanciaRegistros: registros.map((r) => ({
      ...r,
      /** Firestore chama toISOString em Date — nunca enviar Invalid Date */
      dataRegistro: parseBioDataRegistro(r.dataRegistro),
    })),
  });
}

/** Buscar registros de bio impedância do paciente */
export async function buscarBioImpedanciaRegistros(
  pacienteId: string
): Promise<BioImpedanciaRegistro[]> {
  const snap = await getDoc(doc(db, COLLECTION, pacienteId));
  const data = snap.data();
  const arr = data?.bioimpedanciaRegistros || [];
  return arr.map((r: any) => ({
    ...r,
    dataRegistro: parseBioDataRegistro(
      r.dataRegistro?.toDate ? r.dataRegistro.toDate() : r.dataRegistro
    ),
  }));
}
